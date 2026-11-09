"use client";

import dynamic from "next/dynamic";
export type { TLEditorSnapshot } from "tldraw";

// tldraw touches `window` at import time, same reason components/map-canvas.tsx dynamic-imports.
export const BoardWhiteboard = dynamic(() => import("@/components/board-whiteboard-inner").then(m => m.BoardWhiteboardInner), {
  ssr: false,
  loading: () => <div className="flex h-[640px] items-center justify-center rounded-md border text-sm text-muted-foreground">Loading whiteboard…</div>,
});
