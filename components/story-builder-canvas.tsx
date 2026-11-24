"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useViewport,
  useReactFlow,
  useNodesState,
  type Viewport,
  type Node as FlowNode,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { createEntityAction, deleteEntityAction, updateFieldAction } from "@/lib/world/actions";
import type { CanvasBeat, BoardNodePositions } from "@/lib/world/queries";
import { YEAR_WIDTH, DEFAULT_START_YEAR } from "@/lib/story-builder/canvas-scale";
import { STORY_BUILDER_NODE_TYPES, type BeatNodeData, type BeatDraftNodeData } from "@/components/story-builder-beat-node";

interface StoryBuilderCanvasProps {
  boardId: number;
  initialViewport: { x: number; y: number; zoom: number } | null;
  initialBeats: CanvasBeat[];
  initialNodePositions: BoardNodePositions;
}

// Pinned to the top of the canvas, following pan and zoom (board 5): a year axis that extends in
// both directions as you pan, reading its own position straight from React Flow's live viewport
// rather than keeping a duplicate copy of it.
function TimelineRuler() {
  const { x, y, zoom } = useViewport();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pxToYear = useCallback((screenX: number) => (screenX - x) / zoom / YEAR_WIDTH, [x, zoom]);

  const startYear = Math.floor(pxToYear(0)) - 1;
  const endYear = Math.ceil(pxToYear(width)) + 1;
  const years: number[] = [];
  for (let yr = startYear; yr <= endYear; yr++) years.push(yr);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-x-0 top-0 z-10 h-11 border-b bg-white/95"
    >
      <div className="absolute left-3 top-1 text-[10px] uppercase tracking-wider text-neutral-500">
        Timeline (years from Sero&apos;s birth)
      </div>
      <div className="relative h-full">
        {years.map((yr) => (
          <div key={yr} className="absolute top-6 flex -translate-x-1/2 flex-col items-center" style={{ left: yr * YEAR_WIDTH * zoom + x }}>
            <div className="h-2 w-px bg-neutral-300" />
            <span className="mt-0.5 text-[11px] text-neutral-500">{yr}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DRAFT_ID = "__draft__";

function beatToFlowNode(beat: CanvasBeat, positions: BoardNodePositions, index: number, onRename: BeatNodeData["onRename"]): FlowNode {
  const stored = positions[beat.code];
  const x = beat.startYear != null ? beat.startYear * YEAR_WIDTH : (stored?.x ?? DEFAULT_START_YEAR * YEAR_WIDTH);
  const y = stored?.y ?? 80 + (index % 6) * 70;
  return {
    id: beat.code,
    type: "beat",
    position: { x, y },
    data: { beatId: beat.id, name: beat.name, startYear: beat.startYear, onRename } satisfies BeatNodeData,
  };
}

function CanvasInner({ boardId, initialViewport, initialBeats, initialNodePositions }: StoryBuilderCanvasProps) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { screenToFlowPosition } = useReactFlow();
  const positionsRef = useRef<BoardNodePositions>(initialNodePositions);
  const beatByCode = useRef<Map<string, CanvasBeat>>(new Map(initialBeats.map((b) => [b.code, b])));

  const onRename = useCallback((beatId: number, name: string) => {
    void updateFieldAction("beats", beatId, "name", name);
    setNodes((nds) => nds.map((n) => (n.data as BeatNodeData).beatId === beatId
      ? { ...n, data: { ...(n.data as BeatNodeData), name } satisfies BeatNodeData }
      : n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [nodes, setNodes, onNodesChangeBase] = useNodesState<FlowNode>(
    initialBeats.map((b, i) => beatToFlowNode(b, initialNodePositions, i, onRename))
  );

  function persistPositions(next: BoardNodePositions) {
    positionsRef.current = next;
    void updateFieldAction("boards", boardId, "nodePositions", next);
  }

  // React Flow's own `defaultViewport` prop is the reliable way to set the initial viewport -- an
  // imperative setViewport() call in a mount effect races the renderer's own first paint and loses.
  // Default view: years 0 to 5 in frame, with a little breathing room on the left (board 5).
  const defaultViewport: Viewport = initialViewport ?? { x: -DEFAULT_START_YEAR * YEAR_WIDTH + 80, y: 0, zoom: 1 };

  // Persist the viewport (hard rule 18: layout position belongs to the board) so the canvas opens
  // where it was left, same spirit as Home's "Continue where you left off" card.
  const onMoveEnd = useCallback(
    (_event: unknown, viewport: Viewport) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void updateFieldAction("boards", boardId, "viewport", {
          x: viewport.x,
          y: viewport.y,
          zoom: viewport.zoom,
        });
      }, 500);
    },
    [boardId]
  );

  // Moving a box horizontally sets its date (whole years only); moving it vertically carries no
  // meaning of its own and is stored on the board (hard rule 18). The very first move is what takes
  // a box out of its Undated state.
  const onNodeDragStop: OnNodeDrag<FlowNode> = useCallback((_event, node) => {
    if (node.id === DRAFT_ID) return;
    const beat = beatByCode.current.get(node.id);
    if (!beat) return;

    const year = Math.round(node.position.x / YEAR_WIDTH);
    if (beat.startYear !== year) {
      beat.startYear = year;
      void updateFieldAction("beats", beat.id, "startYear", year);
      setNodes((nds) => nds.map((n) => (n.id === node.id
        ? { ...n, data: { ...(n.data as BeatNodeData), startYear: year } satisfies BeatNodeData }
        : n)));
    }

    persistPositions({ ...positionsRef.current, [node.id]: { x: node.position.x, y: node.position.y } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const onNodesDelete = useCallback((deleted: FlowNode[]) => {
    const next = { ...positionsRef.current };
    for (const n of deleted) {
      if (n.id === DRAFT_ID) continue;
      const beat = beatByCode.current.get(n.id);
      if (!beat) continue;
      void deleteEntityAction("beats", beat.id);
      beatByCode.current.delete(n.id);
      delete next[n.id];
    }
    persistPositions(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const cancelDraft = useCallback(() => {
    setNodes((nds) => nds.filter((n) => n.id !== DRAFT_ID));
  }, [setNodes]);

  const commitDraft = useCallback(async (position: { x: number; y: number }, name: string) => {
    cancelDraft();
    const result = await createEntityAction("beats", { name });
    if (result.error || !result.code) return;
    const beat: CanvasBeat = { id: result.id, code: result.code, name, startYear: null, storyId: null };
    beatByCode.current.set(beat.code, beat);
    persistPositions({ ...positionsRef.current, [beat.code]: { x: position.x, y: position.y } });
    setNodes((nds) => [...nds, beatToFlowNode(beat, positionsRef.current, 0, onRename)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelDraft, setNodes, onRename]);

  const addDraftAt = useCallback((position: { x: number; y: number }) => {
    setNodes((nds) => {
      if (nds.some((n) => n.id === DRAFT_ID)) return nds;
      const data: BeatDraftNodeData = {
        onCommit: (name: string) => void commitDraft(position, name),
        onCancel: cancelDraft,
      };
      return [...nds, { id: DRAFT_ID, type: "draft", position, data, draggable: false, selectable: false }];
    });
  }, [setNodes, commitDraft, cancelDraft]);

  const onPaneDoubleClick = useCallback((event: ReactMouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains("react-flow__pane")) return;
    addDraftAt(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }, [addDraftAt, screenToFlowPosition]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      const typing = active instanceof HTMLElement && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
      if (typing || e.key.toLowerCase() !== "n") return;
      e.preventDefault();
      const container = document.querySelector(".react-flow__pane");
      const rect = container?.getBoundingClientRect();
      const center = rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : { x: 400, y: 300 };
      addDraftAt(screenToFlowPosition(center));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addDraftAt, screenToFlowPosition]);

  return (
    <div
      onDoubleClick={onPaneDoubleClick}
      className="relative h-[calc(100vh-170px)] min-h-[480px] overflow-hidden rounded-md border bg-white"
    >
      <ReactFlow
        nodes={nodes}
        edges={[]}
        nodeTypes={STORY_BUILDER_NODE_TYPES}
        onNodesChange={onNodesChangeBase}
        onNodeDragStop={onNodeDragStop}
        onNodesDelete={onNodesDelete}
        defaultViewport={defaultViewport}
        onMoveEnd={onMoveEnd}
        minZoom={0.2}
        maxZoom={2.5}
        panOnScroll
        zoomOnDoubleClick={false}
        deleteKeyCode={["Backspace", "Delete"]}
      >
        <Background color="#8a8a8a" gap={28} size={1.4} />
        <Controls showInteractive={false} />
      </ReactFlow>
      <TimelineRuler />
    </div>
  );
}

// Step SB2/SB3: the canvas -- React Flow, dotted background, pan, zoom, the pinned timeline ruler,
// and beat boxes (create by double-click/N and typing, move to set the date, delete). The shelf
// (SB4), merging (SB5), the expanded popup (SB6) and AI helpers (SB7) are not built yet.
export function StoryBuilderCanvas(props: StoryBuilderCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
