"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node as FlowNode,
  type Edge as FlowEdge,
  type OnNodeDrag,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GRAPH_NODE_TYPES, type GraphNodeData } from "@/components/graph-node";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { layoutNodeMap } from "@/lib/graph/layout";
import { updateFieldAction } from "@/lib/world/actions";
import type { Graph } from "@/lib/graph/types";
import type { BoardQuery, BoardNodePositions } from "@/lib/world/queries";

export interface GraphCandidate {
  code: string;
  name: string;
  collection: string;
}

const COLLECTION_LABELS: Record<string, string> = {
  characters: "Characters", locations: "Locations", items: "Items", factions: "Factions",
  cultures: "Cultures", races: "Races", languages: "Languages", lore: "Lore",
  events: "Events", stories: "Stories",
};

const SOURCE_OPTIONS = [
  { value: "relationship", label: "Relationships" },
  { value: "field", label: "Fields" },
  { value: "parent", label: "Part of / has part" },
  { value: "text", label: "Mentions" },
  { value: "pin", label: "Map pins" },
];

export function BoardGraphView({
  boardId, candidates,
  initialRootCodes, initialQuery, initialLayoutMode, initialNodePositions,
}: {
  boardId: number;
  candidates: GraphCandidate[];
  initialRootCodes: string[];
  initialQuery: BoardQuery;
  initialLayoutMode: string;
  initialNodePositions: BoardNodePositions;
}) {
  const router = useRouter();
  const [rootCodes, setRootCodes] = useState<string[]>(initialRootCodes);
  const [collections, setCollections] = useState<string[]>(initialQuery.collections ?? []);
  const [sources, setSources] = useState<string[]>(initialQuery.sources ?? []);
  const [depth, setDepth] = useState(initialQuery.depth || 2);
  const [layoutMode, setLayoutMode] = useState<"auto_tree" | "manual">(initialLayoutMode === "manual" ? "manual" : "auto_tree");
  const [positions, setPositions] = useState<BoardNodePositions>(initialNodePositions);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const candidateOptions: MultiSelectOption[] = useMemo(
    () => candidates.map(c => ({ value: c.code, label: c.name, group: COLLECTION_LABELS[c.collection] ?? c.collection })),
    [candidates],
  );
  const collectionOptions: MultiSelectOption[] = useMemo(
    () => Object.entries(COLLECTION_LABELS).map(([value, label]) => ({ value, label })),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    async function load() {
      const params = new URLSearchParams();
      if (collections.length) params.set("collections", collections.join(","));

      if (rootCodes.length === 0) {
        const g: Graph = await fetch(`/api/graph${params.toString() ? `?${params.toString()}` : ""}`).then(r => r.json());
        if (!cancelled) { setGraph(g); setLoading(false); }
        return;
      }

      const p = new URLSearchParams(params);
      p.set("depth", String(depth));
      if (sources.length) p.set("sources", sources.join(","));

      const results = await Promise.all(
        rootCodes.map(code => fetch(`/api/graph/${code}?${p.toString()}`).then(r => r.json() as Promise<Graph>))
      );
      if (cancelled) return;
      const nodesByCode = new Map<string, Graph["nodes"][number]>();
      const edgesByKey = new Map<string, Graph["edges"][number]>();
      let truncated = false;
      for (const g of results) {
        for (const n of g.nodes) nodesByCode.set(n.code, n);
        for (const e of g.edges) edgesByKey.set(e.id, e);
        truncated = truncated || g.truncated;
      }
      setGraph({ nodes: [...nodesByCode.values()], edges: [...edgesByKey.values()], truncated });
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [collections, sources, rootCodes, depth]);

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!graph) return { flowNodes: [] as FlowNode[], flowEdges: [] as FlowEdge[] };
    const autoPositions = layoutNodeMap(graph.nodes, graph.edges);

    const fNodes: FlowNode[] = graph.nodes
      .filter(n => autoPositions.has(n.code) || positions[n.code])
      .map(n => {
        const manual = positions[n.code];
        const pos = layoutMode === "manual" && manual ? manual : (autoPositions.get(n.code) ?? manual ?? { x: 0, y: 0 });
        return {
          id: n.code,
          type: "graphNode",
          position: pos,
          data: {
            code: n.code, name: n.name, color: n.color, icon: n.icon, unk: n.unk,
            isCenter: rootCodes.includes(n.code),
            dimmed: false,
          } satisfies GraphNodeData,
        };
      });

    const fEdges: FlowEdge[] = graph.edges.map(e => ({
      id: e.id,
      source: e.from,
      target: e.to,
      label: e.label,
      animated: e.source === "relationship",
      style: { stroke: e.broken ? "#dc2626" : "#94a3b8", strokeDasharray: e.broken ? "4 4" : undefined },
      labelStyle: { fontSize: 10, fill: "#64748b" },
    }));

    return { flowNodes: fNodes, flowEdges: fEdges };
  }, [graph, layoutMode, positions, rootCodes]);

  const onNodeDoubleClick = useCallback((_: React.MouseEvent, node: FlowNode) => {
    const data = node.data as unknown as GraphNodeData;
    const collection = graph?.nodes.find(n => n.code === data.code)?.collection ?? "characters";
    router.push(`/view/${collection}/${data.code}`);
  }, [router, graph]);

  const onNodeDragStop: OnNodeDrag<FlowNode> = useCallback((_, node) => {
    setPositions(prev => ({ ...prev, [node.id]: { x: node.position.x, y: node.position.y } }));
    setLayoutMode("manual");
    setDirty(true);
  }, []);

  async function handleSave() {
    setSaving(true);
    await Promise.all([
      updateFieldAction("boards", boardId, "rootCodes", rootCodes),
      updateFieldAction("boards", boardId, "query", { collections, relationshipTypes: [], sources, direction: "both", depth, yearFrom: null, yearTo: null }),
      updateFieldAction("boards", boardId, "layoutMode", layoutMode),
      updateFieldAction("boards", boardId, "nodePositions", positions),
    ]);
    setSaving(false);
    setDirty(false);
  }

  function handleResetLayout() {
    setPositions({});
    setLayoutMode("auto_tree");
    setDirty(true);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
        <div className="min-w-56 flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Starting entries (blank = whole graph)</label>
          <MultiSelect
            options={candidateOptions}
            selected={rootCodes}
            onChange={(v) => { setRootCodes(v); setDirty(true); }}
            placeholder="Whole graph"
          />
        </div>
        {rootCodes.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Steps out</label>
            <input
              type="number" min={1} max={5} value={depth}
              onChange={(e) => { setDepth(Math.max(1, Math.min(5, Number(e.target.value) || 1))); setDirty(true); }}
              className="h-9 w-16 rounded-md border bg-background px-2 text-sm"
            />
          </div>
        )}
        <div className="min-w-56 flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Collections</label>
          <MultiSelect options={collectionOptions} selected={collections} onChange={(v) => { setCollections(v); setDirty(true); }} placeholder="All collections" />
        </div>
        <div className="min-w-56 flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Connection type</label>
          <MultiSelect options={SOURCE_OPTIONS} selected={sources} onChange={(v) => { setSources(v); setDirty(true); }} placeholder="All types" />
        </div>
        <button type="button" onClick={handleResetLayout} className="h-9 rounded-md border px-3 text-xs hover:bg-accent">
          Reset to auto layout
        </button>
        <button
          type="button" onClick={handleSave} disabled={!dirty || saving}
          className="h-9 rounded-md bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save view"}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Drag a node to switch to manual layout. Double-click a node to open its entry in a popup.
        {layoutMode === "manual" && <span className="ml-1 font-medium">Manual layout — drag freely, then Save view.</span>}
        {graph?.truncated && <span className="ml-1 font-medium text-amber-600">Truncated — too many nodes to show at once; narrow the filters.</span>}
      </p>

      <div className="h-[640px] rounded-md border bg-muted/10">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : flowNodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No connected entries match these filters.</div>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={GRAPH_NODE_TYPES}
            nodesDraggable
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeDragStop={onNodeDragStop}
            fitView
            minZoom={0.1}
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable nodeColor={(n) => (n.data as unknown as GraphNodeData).color} />
          </ReactFlow>
        )}
      </div>
    </div>
  );
}
