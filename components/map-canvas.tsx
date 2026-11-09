"use client";

import dynamic from "next/dynamic";
export type { MapData, PinData, LayerData, PinGroupData } from "@/components/map-canvas-inner";

// Leaflet touches `window` at import time, so this must only ever render client-side — same
// reason components/timeline-view.tsx dynamic-imports its inner component.
export const MapCanvas = dynamic(() => import("@/components/map-canvas-inner").then(m => m.MapCanvasInner), {
  ssr: false,
  loading: () => <div className="flex h-[560px] items-center justify-center rounded-md border text-sm text-muted-foreground">Loading map…</div>,
});
