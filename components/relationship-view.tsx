"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  type Node as FlowNode,
  type Edge as FlowEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GRAPH_NODE_TYPES, type GraphNodeData } from "@/components/graph-node";
import { layoutRelationshipView, type RelatedNode } from "@/lib/graph/layout";
import type { Edge, Node } from "@/lib/graph/types";

interface LinksResponse {
  code: string;
  grouped: Record<string, Record<string, { edge: Edge; direction: "outward" | "inward"; label: string; other: Node }[]>>;
  total: number;
}

// Entry-centered visual companion to "What links here" (components/what-links-here.tsx, the
// plain list). The record sits in the middle, everything it connects to is grouped into columns
// by relationship type (lib/graph/layout.ts), with the Family column ordered as a small tree.
export function RelationshipView({ code, name, color, icon }: { code: string; name: string; color: string; icon: string }) {
  const router = useRouter();
  const [data, setData] = useState<LinksResponse | null>(null);

  useEffect(() => {
    fetch(`/api/codes/${code}/links`).then(r => r.json()).then(setData);
  }, [code]);

  const related: RelatedNode[] = useMemo(() => {
    if (!data) return [];
    const out: RelatedNode[] = [];
    for (const bySource of Object.values(data.grouped)) {
      for (const entries of Object.values(bySource)) {
        for (const entry of entries) out.push({ node: entry.other, edge: entry.edge, direction: entry.direction, label: entry.label });
      }
    }
    return out;
  }, [data]);

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!related.length) return { flowNodes: [] as FlowNode[], flowEdges: [] as FlowEdge[] };
    const positions = layoutRelationshipView(code, related);

    const fNodes: FlowNode[] = [
      {
        id: code,
        type: "graphNode",
        position: positions.get(code)!,
        data: { code, name, color, icon, unk: false, isCenter: true } satisfies GraphNodeData,
      },
      ...related.map(r => ({
        id: `${r.node.code}-${r.edge.id}`,
        type: "graphNode",
        position: positions.get(r.node.code) ?? { x: 0, y: 0 },
        data: { code: r.node.code, name: r.node.name, color: r.node.color, icon: r.node.icon, unk: r.node.unk } satisfies GraphNodeData,
      })),
    ];

    const fEdges: FlowEdge[] = related.map(r => {
      const relatedId = `${r.node.code}-${r.edge.id}`;
      return {
        id: r.edge.id,
        source: r.direction === "outward" ? code : relatedId,
        target: r.direction === "outward" ? relatedId : code,
        label: r.label,
        style: { stroke: "#94a3b8" },
        labelStyle: { fontSize: 10, fill: "#64748b" },
      };
    });

    return { flowNodes: fNodes, flowEdges: fEdges };
  }, [related, code, name, color, icon]);

  const onNodeDoubleClick = (_: unknown, flowNode: FlowNode) => {
    if (flowNode.id === code) return;
    const r = related.find(r => `${r.node.code}-${r.edge.id}` === flowNode.id);
    if (r) router.push(`/view/${r.node.collection}/${r.node.code}`);
  };

  if (data && related.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">Relationship view</h2>
        <p className="text-sm italic text-muted-foreground">Nothing to map yet.</p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">Relationship view</h2>
      <div className="h-[420px] rounded-md border bg-muted/10">
        {!data ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={GRAPH_NODE_TYPES}
            onNodeDoubleClick={onNodeDoubleClick}
            fitView
            minZoom={0.2}
          >
            <Background />
            <Controls showInteractive={false} />
          </ReactFlow>
        )}
      </div>
    </section>
  );
}
