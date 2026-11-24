"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useViewport,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { updateFieldAction } from "@/lib/world/actions";
import { YEAR_WIDTH, DEFAULT_START_YEAR } from "@/lib/story-builder/canvas-scale";

interface StoryBuilderCanvasProps {
  boardId: number;
  initialViewport: { x: number; y: number; zoom: number } | null;
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

function CanvasInner({ boardId, initialViewport }: StoryBuilderCanvasProps) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <div className="relative h-[calc(100vh-170px)] min-h-[480px] overflow-hidden rounded-md border bg-white">
      <ReactFlow
        nodes={[]}
        edges={[]}
        defaultViewport={defaultViewport}
        onMoveEnd={onMoveEnd}
        minZoom={0.2}
        maxZoom={2.5}
        panOnScroll
      >
        <Background color="#8a8a8a" gap={28} size={1.4} />
        <Controls showInteractive={false} />
      </ReactFlow>
      <TimelineRuler />
    </div>
  );
}

// Step SB2: the canvas shell -- React Flow, dotted background, pan, zoom, the pinned timeline ruler.
// Boxes (SB3), the shelf (SB4), merging (SB5), the expanded popup (SB6) and AI helpers (SB7) are not
// built yet; this component only establishes the surface they will land on.
export function StoryBuilderCanvas(props: StoryBuilderCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
