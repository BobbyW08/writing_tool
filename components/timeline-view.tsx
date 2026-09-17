"use client";

import dynamic from "next/dynamic";
export type { TimelineEventInput } from "@/components/timeline-view-inner";

// react-calendar-timeline measures its container and uses legacy context APIs that
// break during Next.js server-side prerendering — it must only ever render client-side.
export const TimelineView = dynamic(() => import("@/components/timeline-view-inner"), {
  ssr: false,
  loading: () => <div className="flex h-96 items-center justify-center rounded-md border text-sm text-muted-foreground">Loading timeline…</div>,
});
