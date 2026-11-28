"use client";

import { useCallback, useEffect, useRef, useState, type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent } from "react";
import { toast } from "sonner";
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
import {
  createEntityAction, deleteEntityAction, updateFieldAction, convertBeatToEntityAction,
  createRelationshipAction, deleteRelationshipAction, addStoryInvolvesAction, removeStoryInvolvesAction,
  addEventInvolvesAction, removeEventInvolvesAction,
} from "@/lib/world/actions";
import type { CanvasBeat, BoardNodePositions, ShelfEntry } from "@/lib/world/queries";
import { YEAR_WIDTH, DEFAULT_START_YEAR, yearToX } from "@/lib/story-builder/canvas-scale";
import { RELATIONSHIP_TYPES } from "@/lib/relationshipTypes";
import { resolveMergePairing, type MergePairing } from "@/lib/story-builder/merge";
import { EntryNode, type EntryNodeData, ENTRY_COLLECTION_LABELS } from "@/components/story-builder-entry-node";
import { StoryBuilderShelf, SHELF_DRAG_TYPE } from "@/components/story-builder-shelf";
import { STORY_BUILDER_NODE_TYPES, type BeatNodeData, type BeatDraftNodeData, type BeatConvertCollection, type GhostNodeData } from "@/components/story-builder-beat-node";
import { MergeMenu } from "@/components/story-builder-merge-menu";
import { StoryBuilderBoxPopup, type BoxPopupTarget } from "@/components/story-builder-box-popup";
import { generateBeatCardsAction } from "@/lib/ai/actions";
import { acceptBeatCardAction } from "@/lib/story-builder/popup-actions";

interface StoryBuilderCanvasProps {
  boardId: number;
  initialViewport: { x: number; y: number; zoom: number } | null;
  initialBeats: CanvasBeat[];
  initialNodePositions: BoardNodePositions;
  initialEntries: ShelfEntry[];
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
const NODE_TYPES = { ...STORY_BUILDER_NODE_TYPES, entry: EntryNode };

// An existing entry placed on the canvas (step SB4). It sits at the year it already has when it has
// one (events and stories: startYear, items: createdYear); otherwise at its stored or dropped
// position, undated. A character's box shows an age at whatever year it sits on, so it never
// counts as undated for placement purposes.
function entryToFlowNode(
  entry: ShelfEntry, positions: BoardNodePositions, fallback: { x: number; y: number }, onSuggest?: EntryNodeData["onSuggest"]
): FlowNode {
  const stored = positions[entry.code];
  const x = entry.year != null ? yearToX(entry.year) : (stored?.x ?? fallback.x);
  const y = stored?.y ?? fallback.y;
  return {
    id: entry.code,
    type: "entry",
    position: { x, y },
    data: {
      collection: entry.collection,
      code: entry.code,
      name: entry.name,
      atYear: Math.round(x / YEAR_WIDTH),
      undated: entry.year == null,
      birthYear: entry.birthYear,
      onSuggest,
    } satisfies EntryNodeData,
  };
}

// Only these write a year of their own when dragged sideways (hard rule 18). Characters, locations
// and lore keep the horizontal position as a board position only.
const YEAR_FIELD: Partial<Record<ShelfEntry["collection"], string>> = {
  events: "startYear",
  stories: "startYear",
  items: "createdYear",
};

// SB8: keyboard moves. Horizontal is a whole year at a time (dates are whole years, hard rule 18);
// vertical is a small board-position step with no date meaning of its own (hard rule 15).
const ARROW_NUDGE: Record<string, [number, number]> = {
  ArrowLeft: [-YEAR_WIDTH, 0],
  ArrowRight: [YEAR_WIDTH, 0],
  ArrowUp: [0, -20],
  ArrowDown: [0, 20],
};

function beatToFlowNode(
  beat: CanvasBeat,
  positions: BoardNodePositions,
  index: number,
  onRename: BeatNodeData["onRename"],
  onConvert: BeatNodeData["onConvert"],
  onSuggest: BeatNodeData["onSuggest"]
): FlowNode {
  const stored = positions[beat.code];
  const x = beat.startYear != null ? beat.startYear * YEAR_WIDTH : (stored?.x ?? DEFAULT_START_YEAR * YEAR_WIDTH);
  const y = stored?.y ?? 80 + (index % 6) * 70;
  return {
    id: beat.code,
    type: "beat",
    position: { x, y },
    data: { beatId: beat.id, name: beat.name, startYear: beat.startYear, onRename, onConvert, onSuggest } satisfies BeatNodeData,
  };
}

function CanvasInner({ boardId, initialViewport, initialBeats, initialNodePositions, initialEntries }: StoryBuilderCanvasProps) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { screenToFlowPosition, getIntersectingNodes } = useReactFlow();
  const positionsRef = useRef<BoardNodePositions>(initialNodePositions);
  const beatByCode = useRef<Map<string, CanvasBeat>>(new Map(initialBeats.map((b) => [b.code, b])));
  const entryByCode = useRef<Map<string, ShelfEntry>>(new Map(initialEntries.map((e) => [e.code, e])));
  // Codes of entries already on the canvas, which is also what the shelf hides.
  const [placed, setPlaced] = useState<Set<string>>(
    () => new Set(initialEntries.filter((e) => initialNodePositions[e.code]).map((e) => e.code))
  );
  // Step SB5: a pending merge, once one box has been dropped onto another and a pairing the Canvas
  // spec names (lib/story-builder/merge.ts) was found. Nothing is written until this resolves (hard
  // rule 19) -- the dragged box is snapped back to its resting position the moment this is set, and
  // only "Group on this canvas only" (character onto character) lets the drop itself stand.
  const [mergeRequest, setMergeRequest] = useState<{ pairing: MergePairing; dropYear: number; droppedPosition: { x: number; y: number } } | null>(null);
  const [mergeSaving, setMergeSaving] = useState(false);

  // Step SB6: double-clicking an existing box opens its expanded popup. A single click still just
  // selects it (the beat convert dropdown, SB4); double-click on blank canvas still creates a draft
  // (onPaneDoubleClick, below) since that only fires for clicks on the pane itself, never on a node.
  const [popupTarget, setPopupTarget] = useState<BoxPopupTarget | null>(null);
  // SB8: below the `lg` breakpoint the shelf is a drawer instead of a fixed column, so it stops
  // squeezing the canvas down to nothing on a narrow screen.
  const [shelfOpen, setShelfOpen] = useState(false);
  const onNodeDoubleClick = useCallback((_event: ReactMouseEvent, node: FlowNode) => {
    if (node.id === DRAFT_ID) return;
    const entry = entryByCode.current.get(node.id);
    if (entry) {
      setPopupTarget({ kind: "entry", collection: entry.collection, code: entry.code, name: entry.name, label: ENTRY_COLLECTION_LABELS[entry.collection] });
      return;
    }
    const beat = beatByCode.current.get(node.id);
    if (beat) setPopupTarget({ kind: "beat", code: beat.code, name: beat.name });
  }, []);

  const onRename = useCallback((beatId: number, name: string) => {
    void updateFieldAction("beats", beatId, "name", name);
    setNodes((nds) => nds.map((n) => (n.data as BeatNodeData).beatId === beatId
      ? { ...n, data: { ...(n.data as BeatNodeData), name } satisfies BeatNodeData }
      : n));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Step SB7: idea generation from a selected box. onSuggestIdeasStable is what node data actually
  // holds (a stable identity, so entryToFlowNode/beatToFlowNode calls don't need to be redone on
  // every render) -- it forwards to whatever onSuggestIdeas currently is via a ref, since
  // onSuggestIdeas itself closes over the live `nodes` array to find the selected box's position.
  const onSuggestIdeasRef = useRef<(code: string) => void>(() => {});
  const onSuggestIdeasStable = useCallback((code: string) => onSuggestIdeasRef.current(code), []);

  // Step SB4: "Make this a..." on a beat box. The beat stays in place (it is just marked promoted,
  // same as promoteBeatToEventAction already did for the Beats lane) -- the new entity's box takes
  // over the same board position, same way a deleted box's position is freed up elsewhere here.
  const onConvertBeat = useCallback(async (beatId: number, collection: BeatConvertCollection) => {
    const match = [...beatByCode.current.entries()].find(([, b]) => b.id === beatId);
    if (!match) return;
    const [oldCode, beat] = match;
    const result = await convertBeatToEntityAction(beatId, collection);
    if (result.error || !result.code || !result.id) {
      toast.error(result.error ?? "Could not convert this idea.");
      return;
    }
    const newCode = result.code;
    const oldPos = positionsRef.current[oldCode];
    const newEntry: ShelfEntry = {
      id: result.id,
      code: newCode,
      name: beat.name,
      collection,
      year: collection === "events" || collection === "stories" ? beat.startYear : null,
      birthYear: collection === "characters" ? beat.startYear : null,
    };

    beatByCode.current.delete(oldCode);
    entryByCode.current.set(newCode, newEntry);

    const nextPositions = { ...positionsRef.current };
    if (oldPos) {
      nextPositions[newCode] = oldPos;
      delete nextPositions[oldCode];
    }
    persistPositions(nextPositions);
    setPlaced((prev) => new Set(prev).add(newCode));
    setNodes((nds) => [
      ...nds.filter((n) => n.id !== oldCode),
      entryToFlowNode(newEntry, nextPositions, oldPos ?? { x: 0, y: 80 }, onSuggestIdeasStable),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [nodes, setNodes, onNodesChangeBase] = useNodesState<FlowNode>([
    ...initialBeats.map((b, i) => beatToFlowNode(b, initialNodePositions, i, onRename, onConvertBeat, onSuggestIdeasStable)),
    ...initialEntries
      .filter((e) => initialNodePositions[e.code])
      .map((e) => entryToFlowNode(e, initialNodePositions, { x: 0, y: 80 }, onSuggestIdeasStable)),
  ]);

  function persistPositions(next: BoardNodePositions) {
    positionsRef.current = next;
    void updateFieldAction("boards", boardId, "nodePositions", next);
  }

  // Step SB7: idea generation from a selected box, defined here (after useNodesState) since these
  // close over the live `nodes`/`setNodes`. onSuggestIdeasStable above is what node data actually
  // holds -- a stable identity entryToFlowNode/beatToFlowNode calls don't need redoing on every
  // render -- and forwards to whichever of these is current via the ref.
  const clearGhosts = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.id.startsWith("__ghost__")));
  }, [setNodes]);

  const onDismissGhost = useCallback((ghostId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== ghostId));
  }, [setNodes]);

  // "Add to canvas": the one moment a suggested idea becomes a real beat (hard rule 19's spirit --
  // nothing about a suggestion is real until accepted). Reuses acceptBeatCardAction, the same path
  // the popup's own "What happens next" button saves through.
  const onAddGhost = useCallback((
    ghostId: string, storyId: number, storyCode: string, name: string, summary: string, position: { x: number; y: number }
  ) => {
    setNodes((nds) => nds.map((n) => (n.id === ghostId ? { ...n, data: { ...(n.data as GhostNodeData), pending: true } } : n)));
    void (async () => {
      const result = await acceptBeatCardAction(storyId, name, summary);
      if (!result.ok || !result.id || !result.code) {
        toast.error(result.error ?? "Could not save that idea.");
        setNodes((nds) => nds.map((n) => (n.id === ghostId ? { ...n, data: { ...(n.data as GhostNodeData), pending: false } } : n)));
        return;
      }
      const beat: CanvasBeat = { id: result.id, code: result.code, name, startYear: null, storyId, storyCode };
      beatByCode.current.set(beat.code, beat);
      persistPositions({ ...positionsRef.current, [beat.code]: position });
      setNodes((nds) => [
        ...nds.filter((n) => n.id !== ghostId),
        beatToFlowNode(beat, positionsRef.current, 0, onRename, onConvertBeat, onSuggestIdeasStable),
      ]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSuggestIdeas = useCallback((code: string) => {
    const entry = entryByCode.current.get(code);
    const beat = entry ? undefined : beatByCode.current.get(code);
    let storyId: number;
    let storyCode: string;
    if (entry) {
      if (entry.collection !== "stories") return;
      storyId = entry.id;
      storyCode = entry.code;
    } else if (beat) {
      if (beat.storyId == null || !beat.storyCode) {
        toast.error("Group this idea into a story first.");
        return;
      }
      storyId = beat.storyId;
      storyCode = beat.storyCode;
    } else {
      return;
    }

    clearGhosts();
    const sourceNode = nodes.find((n) => n.id === code);
    const basePos = sourceNode?.position ?? { x: 0, y: 0 };
    void (async () => {
      const result = await generateBeatCardsAction(storyCode);
      if (!result.ok) {
        toast.error(result.error ?? "Could not get ideas.");
        return;
      }
      if (!result.cards?.length) {
        toast.info("No suggestions this time.");
        return;
      }
      const ghostNodes: FlowNode[] = result.cards.map((card, i) => {
        const ghostId = `__ghost__-${Date.now()}-${i}`;
        // Ghost boxes wrap a full summary and run well past 90px tall -- 190px keeps them from
        // stacking on top of each other and hiding each other's Add to canvas/Dismiss buttons.
        const position = { x: basePos.x + 240, y: basePos.y + i * 190 };
        const data: GhostNodeData = {
          name: card.name,
          summary: card.summary,
          pending: false,
          onAdd: () => onAddGhost(ghostId, storyId, storyCode, card.name, card.summary, position),
          onDismiss: () => onDismissGhost(ghostId),
        };
        return { id: ghostId, type: "ghost", position, data, draggable: false, selectable: false };
      });
      setNodes((nds) => [...nds, ...ghostNodes]);
    })();
  }, [nodes, clearGhosts, onAddGhost, onDismissGhost, setNodes]);

  onSuggestIdeasRef.current = onSuggestIdeas;

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

  // Step SB5: while dragging an entry box, highlight whichever other entry box it currently
  // overlaps, as the merge drop target (the Canvas spec's "a highlight shows the drop target").
  const onNodeDrag: OnNodeDrag<FlowNode> = useCallback((_event, node) => {
    if (!entryByCode.current.has(node.id)) return;
    const overlapping = getIntersectingNodes(node, true).find((n) => n.id !== node.id && entryByCode.current.has(n.id));
    const targetId = overlapping?.id ?? null;
    setNodes((nds) => nds.map((n) => {
      if (!entryByCode.current.has(n.id) || n.id === node.id) return n;
      const shouldHighlight = n.id === targetId;
      if (Boolean((n.data as EntryNodeData).highlighted) === shouldHighlight) return n;
      return { ...n, data: { ...(n.data as EntryNodeData), highlighted: shouldHighlight } satisfies EntryNodeData };
    }));
  }, [getIntersectingNodes, setNodes]);

  // Moving a box horizontally sets its date (whole years only); moving it vertically carries no
  // meaning of its own and is stored on the board (hard rule 18). The very first move is what takes
  // a box out of its Undated state. Dropping one entry box onto another is a merge instead (SB5):
  // nothing is written until the menu resolves, so the drop itself never counts as a move.
  const onNodeDragStop: OnNodeDrag<FlowNode> = useCallback((_event, node) => {
    if (node.id === DRAFT_ID) return;

    const entry = entryByCode.current.get(node.id);
    if (entry) {
      const overlapping = getIntersectingNodes(node, true).find((n) => n.id !== node.id && entryByCode.current.has(n.id));
      // Clear every highlight regardless of outcome -- onNodeDrag only runs while the pointer moves.
      setNodes((nds) => nds.map((n) => (
        entryByCode.current.has(n.id) && (n.data as EntryNodeData).highlighted
          ? { ...n, data: { ...(n.data as EntryNodeData), highlighted: false } satisfies EntryNodeData }
          : n
      )));

      if (overlapping) {
        const target = entryByCode.current.get(overlapping.id)!;
        const droppedPosition = { x: node.position.x, y: node.position.y };
        setNodes((nds) => nds.map((n) => (n.id === node.id ? entryToFlowNode(entry, positionsRef.current, droppedPosition, onSuggestIdeasStable) : n)));
        const pairing = resolveMergePairing(entry, target);
        if (!pairing) {
          toast.error(`${entry.name} can't be merged with ${target.name} this way.`);
          return;
        }
        setMergeRequest({ pairing, dropYear: Math.round(droppedPosition.x / YEAR_WIDTH), droppedPosition });
        return;
      }

      const entryYear = Math.round(node.position.x / YEAR_WIDTH);
      const field = YEAR_FIELD[entry.collection];
      if (field && entry.year !== entryYear) {
        entry.year = entryYear;
        void updateFieldAction(entry.collection, entry.id, field, entryYear);
      }
      setNodes((nds) => nds.map((n) => (n.id === node.id
        ? { ...n, data: { ...(n.data as EntryNodeData), atYear: entryYear, undated: field ? false : (n.data as EntryNodeData).undated } satisfies EntryNodeData }
        : n)));
      persistPositions({ ...positionsRef.current, [node.id]: { x: node.position.x, y: node.position.y } });
      return;
    }

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
  }, [boardId, getIntersectingNodes]);

  // Step SB5: "Group on this canvas only" (character onto character) just lets the drop stand --
  // it is the ordinary move path with no relationship written, since nothing about placement is
  // meant to be special about it (hard rule 19's "writes nothing to canon").
  const onMergeGroup = useCallback(() => {
    if (!mergeRequest || mergeRequest.pairing.kind !== "character-character") { setMergeRequest(null); return; }
    const { a } = mergeRequest.pairing;
    const { droppedPosition } = mergeRequest;
    setNodes((nds) => nds.map((n) => (n.id === a.code ? { ...n, position: droppedPosition } : n)));
    persistPositions({ ...positionsRef.current, [a.code]: droppedPosition });
    setMergeRequest(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeRequest]);

  const onMergeConfirm = useCallback(async (type: string) => {
    if (!mergeRequest) return;
    const { pairing, dropYear } = mergeRequest;
    const [fromCode, toCode] =
      pairing.kind === "character-character" ? [pairing.a.code, pairing.b.code]
      : pairing.kind === "appears-in" ? [pairing.character.code, pairing.story.code]
      : pairing.kind === "participated-in" ? [pairing.character.code, pairing.event.code]
      : [pairing.actor.code, pairing.location.code];

    setMergeSaving(true);
    const result = await createRelationshipAction(fromCode, toCode, type, undefined, dropYear);
    if (!result.ok || !result.id) {
      toast.error(result.error ?? "Could not record the relationship.");
      setMergeSaving(false);
      return;
    }
    const relationshipId = result.id;

    let involvesAdded = false;
    if (pairing.kind === "appears-in") {
      const addResult = await addStoryInvolvesAction(pairing.story.id, "characters", pairing.character.id);
      involvesAdded = addResult.ok;
    } else if (pairing.kind === "participated-in") {
      // This is what makes the event show up on the character's own page as a life event.
      const addResult = await addEventInvolvesAction(pairing.event.id, "characters", pairing.character.id);
      involvesAdded = addResult.ok;
    }

    setMergeSaving(false);
    setMergeRequest(null);

    const typeLabel = RELATIONSHIP_TYPES.find((t) => t.value === type)?.label ?? type;
    toast.success(`${typeLabel}: ${fromCode} → ${toCode}`, {
      action: {
        label: "Undo",
        onClick: () => {
          void deleteRelationshipAction(relationshipId);
          if (involvesAdded && pairing.kind === "appears-in") {
            void removeStoryInvolvesAction(pairing.story.id, "characters", pairing.character.id);
          } else if (involvesAdded && pairing.kind === "participated-in") {
            void removeEventInvolvesAction(pairing.event.id, "characters", pairing.character.id);
          }
        },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeRequest]);

  const onNodesDelete = useCallback((deleted: FlowNode[]) => {
    const next = { ...positionsRef.current };
    for (const n of deleted) {
      if (n.id === DRAFT_ID || n.id.startsWith("__ghost__")) continue;
      // Removing an entry's box takes it off the canvas only. The entry itself is never deleted here.
      if (entryByCode.current.has(n.id)) {
        delete next[n.id];
        setPlaced((prev) => { const copy = new Set(prev); copy.delete(n.id); return copy; });
        continue;
      }
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
    const beat: CanvasBeat = { id: result.id, code: result.code, name, startYear: null, storyId: null, storyCode: null };
    beatByCode.current.set(beat.code, beat);
    persistPositions({ ...positionsRef.current, [beat.code]: { x: position.x, y: position.y } });
    setNodes((nds) => [...nds, beatToFlowNode(beat, positionsRef.current, 0, onRename, onConvertBeat, onSuggestIdeasStable)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelDraft, setNodes, onRename, onConvertBeat]);

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

  const onDragOver = useCallback((event: ReactDragEvent) => {
    if (!event.dataTransfer.types.includes(SHELF_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  // Dropping a shelf entry places that real entry as its own box. A drop writes nothing to the
  // entry; only a later sideways drag of an event, story or item sets its year. An entry already on
  // the canvas is refused with a message (per the Canvas spec).
  const onDrop = useCallback((event: ReactDragEvent) => {
    const code = event.dataTransfer.getData(SHELF_DRAG_TYPE);
    if (!code) return;
    event.preventDefault();
    const entry = entryByCode.current.get(code);
    if (!entry) return;
    if (placed.has(code) || nodes.some((n) => n.id === code)) {
      toast.error(`${entry.name} is already on the canvas.`);
      return;
    }
    const drop = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    const node = entryToFlowNode(entry, {}, { x: drop.x, y: drop.y }, onSuggestIdeasStable);
    // Entries with their own year sit on it; everything else stays where it was dropped, snapped to
    // a whole year like every other box.
    const x = entry.year != null ? yearToX(entry.year) : Math.round(drop.x / YEAR_WIDTH) * YEAR_WIDTH;
    node.position = { x, y: drop.y };
    (node.data as EntryNodeData).atYear = Math.round(x / YEAR_WIDTH);
    persistPositions({ ...positionsRef.current, [code]: { x, y: drop.y } });
    setNodes((nds) => [...nds, node]);
    setPlaced((prev) => new Set(prev).add(code));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, nodes, screenToFlowPosition, setNodes]);

  const onPaneDoubleClick = useCallback((event: ReactMouseEvent) => {
    const target = event.target as HTMLElement;
    if (!target.classList.contains("react-flow__pane")) return;
    addDraftAt(screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }, [addDraftAt, screenToFlowPosition]);

  // SB8: keyboard moves. Horizontal nudges a whole year at a time and set the box's date exactly
  // like a sideways drag does (hard rule 18: dates are whole years); vertical nudges a small board
  // position step with no date meaning of its own (hard rule 15), same as a vertical drag. Every
  // currently selected box moves together. Draft and ghost boxes are skipped -- neither is a real
  // record yet, so neither has a date or a board position to move.
  const nudgeSelected = useCallback((dx: number, dy: number): boolean => {
    const movingIds = new Set(
      nodes.filter((n) => n.selected && n.id !== DRAFT_ID && !n.id.startsWith("__ghost__")).map((n) => n.id)
    );
    if (movingIds.size === 0) return false;

    const nextPositions = { ...positionsRef.current };
    setNodes((nds) => nds.map((n) => {
      if (!movingIds.has(n.id)) return n;
      const position = { x: n.position.x + dx, y: n.position.y + dy };
      nextPositions[n.id] = position;

      const entry = entryByCode.current.get(n.id);
      if (entry) {
        const year = Math.round(position.x / YEAR_WIDTH);
        const field = YEAR_FIELD[entry.collection];
        if (field && entry.year !== year) {
          entry.year = year;
          void updateFieldAction(entry.collection, entry.id, field, year);
        }
        return { ...n, position, data: { ...(n.data as EntryNodeData), atYear: year, undated: field ? false : (n.data as EntryNodeData).undated } satisfies EntryNodeData };
      }

      const beat = beatByCode.current.get(n.id);
      if (beat) {
        const year = Math.round(position.x / YEAR_WIDTH);
        if (beat.startYear !== year) {
          beat.startYear = year;
          void updateFieldAction("beats", beat.id, "startYear", year);
        }
        return { ...n, position, data: { ...(n.data as BeatNodeData), startYear: year } satisfies BeatNodeData };
      }

      return { ...n, position };
    }));
    persistPositions(nextPositions);
    return true;
  }, [nodes, setNodes]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const active = document.activeElement;
      const typing = active instanceof HTMLElement && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable);
      // SB8: N and the arrow nudges are canvas-only shortcuts. The box popup dims the canvas behind
      // it rather than removing it (board 8), and a pending merge menu sits over it the same way, so
      // both are suppressed here too -- not only while a text field has focus -- or pressing N after
      // clicking a popup button (not a text field) could still create a box on the canvas underneath.
      if (typing || popupTarget || mergeRequest) return;

      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        const container = document.querySelector(".react-flow__pane");
        const rect = container?.getBoundingClientRect();
        const center = rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : { x: 400, y: 300 };
        addDraftAt(screenToFlowPosition(center));
        return;
      }

      const delta = ARROW_NUDGE[e.key];
      if (delta && nudgeSelected(delta[0], delta[1])) e.preventDefault();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addDraftAt, screenToFlowPosition, popupTarget, mergeRequest, nudgeSelected]);

  return (
    <div className="flex h-[calc(100vh-170px)] min-h-[480px] gap-3">
      <div
        onDoubleClick={onPaneDoubleClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="relative flex-1 overflow-hidden rounded-md border bg-white"
      >
        <ReactFlow
          nodes={nodes}
          edges={[]}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChangeBase}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodesDelete={onNodesDelete}
          defaultViewport={defaultViewport}
          onMoveEnd={onMoveEnd}
          minZoom={0.2}
          maxZoom={2.5}
          panOnScroll
          zoomOnDoubleClick={false}
          deleteKeyCode={["Backspace", "Delete"]}
          // SB8: a little breathing room around the fitted content, so a box right at the edge
          // isn't flush against the canvas border after Fit View runs.
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background color="#8a8a8a" gap={28} size={1.4} />
          <Controls showInteractive={false} />
        </ReactFlow>
        <TimelineRuler />
        {mergeRequest && (
          <MergeMenu
            pairing={mergeRequest.pairing}
            dropYear={mergeRequest.dropYear}
            saving={mergeSaving}
            onClose={() => setMergeRequest(null)}
            onGroup={onMergeGroup}
            onConfirm={onMergeConfirm}
          />
        )}
        {/* SB8: below `lg` the shelf (to the right) is a drawer instead of a fixed column -- see the
            wrapper below. This toggle only exists at that width; above it the shelf is already
            visible so there is nothing to open. */}
        <button
          type="button"
          onClick={() => setShelfOpen(true)}
          className="absolute right-3 top-14 z-20 rounded-md border bg-white px-2 py-1 text-xs font-medium shadow-sm lg:hidden"
        >
          Shelf
        </button>
      </div>
      {shelfOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setShelfOpen(false)}
        />
      )}
      {/* The shelf itself (components/story-builder-shelf.tsx) is unchanged -- only how it sits next
          to the canvas changes with width. Below `lg` it is a slide-in drawer over the canvas,
          closed by default so a narrow screen keeps the canvas at full width (board 5's three
          columns -- nav, canvas, shelf -- otherwise leave no room for the canvas on a phone). At
          `lg` and up it reverts to the original static column. */}
      <div
        className={`fixed inset-y-0 right-0 z-40 h-full w-64 max-w-[85vw] overflow-y-auto bg-white p-2 shadow-2xl transition-transform duration-200 lg:static lg:z-auto lg:h-auto lg:w-auto lg:max-w-none lg:translate-x-0 lg:overflow-visible lg:bg-transparent lg:p-0 lg:shadow-none lg:transition-none ${
          shelfOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setShelfOpen(false)}
          className="mb-1 block text-xs text-muted-foreground lg:hidden"
        >
          Close
        </button>
        <StoryBuilderShelf entries={initialEntries.filter((e) => !placed.has(e.code))} />
      </div>
      {popupTarget && <StoryBuilderBoxPopup target={popupTarget} onClose={() => setPopupTarget(null)} />}
    </div>
  );
}

// Step SB2/SB3: the canvas -- React Flow, dotted background, pan, zoom, the pinned timeline ruler,
// and beat boxes (create by double-click/N and typing, move to set the date, delete). The shelf
// (SB4), merging (SB5), the expanded popup (SB6), AI helpers (SB7) and polish (SB8) are all built.
export function StoryBuilderCanvas(props: StoryBuilderCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
