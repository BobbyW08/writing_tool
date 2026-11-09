"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import * as Icons from "lucide-react";
import { type LucideIcon, Circle } from "lucide-react";

export type GraphNodeData = {
  code: string;
  name: string;
  color: string;
  icon: string;
  unk: boolean;
  dimmed?: boolean;
  isCenter?: boolean;
};

function iconFor(name: string): LucideIcon {
  const icon = (Icons as unknown as Record<string, LucideIcon>)[name];
  return icon ?? Circle;
}

// The one node renderer every graph view (node map, relationship view) uses — colored and
// iconed by collection (lib/nodeKinds.ts), UNK records flagged, no view defines its own look.
export function GraphNode({ data }: NodeProps & { data: GraphNodeData }) {
  const Icon = iconFor(data.icon);
  return (
    <div
      className="flex items-center gap-1.5 rounded-md border bg-background px-2.5 py-1.5 text-xs shadow-sm"
      style={{
        borderColor: data.color,
        borderWidth: data.isCenter ? 2 : 1,
        opacity: data.dimmed ? 0.35 : 1,
        minWidth: 160,
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <Icon className="size-3.5 shrink-0" style={{ color: data.color }} />
      <span className="truncate font-medium">{data.name}</span>
      <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{data.code}</span>
      {data.unk && (
        <span className="shrink-0 rounded bg-amber-100 px-1 text-[9px] font-semibold uppercase text-amber-800 dark:bg-amber-900/40 dark:text-amber-400">
          UNK
        </span>
      )}
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

export const GRAPH_NODE_TYPES = { graphNode: GraphNode };
