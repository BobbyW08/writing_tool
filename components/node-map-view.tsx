"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node as FlowNode,
  type Edge as FlowEdge,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { GRAPH_NODE_TYPES, type GraphNodeData } from "@/components/graph-node";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { GraphEdgeEditor } from "@/components/graph-edge-editor";
import { GraphConnectForm } from "@/components/graph-connect-form";
import { layoutNodeMap } from "@/lib/graph/layout";
import type { Graph } from "@/lib/graph/types";

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

export function NodeMapView({ candidates }: { candidates: GraphCandidate[] }) {
  const router = useRouter();
  const [collections, setCollections] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [startCode, setStartCode] = useState<string[]>([]);
  const [depth, setDepth] = useState(2);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedEdgeCode, setSelectedEdgeCode] = useState<string | null>(null);
  const [pendingConnect, setPendingConnect] = useState<{ from: string; to: string } | null>(null);

  const candidateOptions: MultiSelectOption[] = useMemo(
    () => candidates.map(c => ({ value: c.code, label: c.name, group: COLLECTION_LABELS[c.collection] ?? c.collection })),
    [candidates],
  );
  const collectionOptions: MultiSelectOption[] = useMemo(
    () => Object.entries(COLLECTION_LABELS).map(([value, label]) => ({ value, label })),
    [],
  );

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (collections.length) params.set("collections", collections.join(","));

    const url = startCode[0]
      ? (() => {
          const p = new URLSearchParams(params);
          p.set("depth", String(depth));
          if (sources.length) p.set("sources", sources.join(","));
          return `/api/graph/${startCode[0]}?${p.toString()}`;
        })()
      : `/api/graph${params.toString() ? `?${params.toString()}` : ""}`;

    fetch(url)
      .then(r => r.json())
      .then((g: Graph) => {
        setGraph(g);
        setLoading(false);
      });
  }, [collections, sources, startCode, depth, refreshKey]);

  const filteredEdges = useMemo(() => {
    if (!graph) return [];
    if (!sources.length || startCode[0]) return graph.edges; // server already filtered when centered
    return graph.edges.filter(e => sources.includes(e.source));
  }, [graph, sources, startCode]);

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!graph) return { flowNodes: [] as FlowNode[], flowEdges: [] as FlowEdge[] };
    const positions = layoutNodeMap(graph.nodes, filteredEdges);
    const connectedCodes = new Set(filteredEdges.flatMap(e => [e.from, e.to]));

    const fNodes: FlowNode[] = graph.nodes
      .filter(n => positions.has(n.code))
      .map(n => ({
        id: n.code,
        type: "graphNode",
        position: positions.get(n.code)!,
        data: {
          code: n.code, name: n.name, color: n.color, icon: n.icon, unk: n.unk,
          isCenter: n.code === startCode[0],
          dimmed: startCode[0] ? !connectedCodes.has(n.code) && n.code !== startCode[0] : false,
        } satisfies GraphNodeData,
      }));

    const fEdges: FlowEdge[] = filteredEdges.map(e => ({
      id: e.id,
      source: e.from,
      target: e.to,
      label: e.label,
      animated: e.source === "relationship",
      style: { stroke: e.broken ? "#dc2626" : "#94a3b8", strokeDasharray: e.broken ? "4 4" : undefined },
      labelStyle: { fontSize: 10, fill: "#64748b" },
    }));

    return { flowNodes: fNodes, flowEdges: fEdges };
  }, [graph, filteredEdges, startCode]);

  // A plain click re-centers the map, but its layout shift can displace the node before a second
  // click lands, so a real double-click would silently degrade into two single clicks. Debounce
  // the center so a double-click can cancel it and navigate instead.
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onNodeClick = useCallback((_: unknown, node: FlowNode) => {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => setStartCode([node.id]), 250);
  }, []);

  const onNodeDoubleClick = useCallback((_: unknown, node: FlowNode) => {
    if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; }
    const data = node.data as unknown as GraphNodeData;
    const collection = graph?.nodes.find(n => n.code === data.code)?.collection ?? "characters";
    router.push(`/view/${collection}/${data.code}`);
  }, [router, graph]);

  // Step U5: an edge is only editable when it's backed by a real relationship record (source ===
  // "relationship"), never a derived field/parent/text/pin connection.
  const onEdgeClick = useCallback((_: unknown, edge: FlowEdge) => {
    const match = filteredEdges.find(e => e.id === edge.id);
    if (match?.source === "relationship" && match.relationshipCode) {
      setSelectedEdgeCode(match.relationshipCode);
    }
  }, [filteredEdges]);

  const onConnect: OnConnect = useCallback((connection) => {
    if (connection.source && connection.target) {
      setPendingConnect({ from: connection.source, to: connection.target });
    }
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
        <div className="min-w-56 flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Starting entry (blank = whole graph)</label>
          <MultiSelect
            options={candidateOptions}
            selected={startCode}
            onChange={(v) => setStartCode(v.length ? [v[v.length - 1]] : [])}
            placeholder="Whole graph"
            maxBadges={1}
          />
        </div>
        {startCode.length > 0 && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Steps out</label>
            <input
              type="number" min={1} max={5} value={depth}
              onChange={(e) => setDepth(Math.max(1, Math.min(5, Number(e.target.value) || 1)))}
              className="h-9 w-16 rounded-md border bg-background px-2 text-sm"
            />
          </div>
        )}
        <div className="min-w-56 flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Collections</label>
          <MultiSelect options={collectionOptions} selected={collections} onChange={setCollections} placeholder="All collections" />
        </div>
        <div className="min-w-56 flex-1">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Connection type</label>
          <MultiSelect options={SOURCE_OPTIONS} selected={sources} onChange={setSources} placeholder="All types" />
        </div>
        {startCode.length > 0 && (
          <button
            type="button"
            onClick={() => setStartCode([])}
            className="h-9 rounded-md border px-3 text-xs hover:bg-accent"
          >
            Show whole graph
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Click a node to center the map on it. Double-click to open its entry in a popup.
        Click a relationship edge to edit it, or drag from one node&apos;s handle to another to create one.
        {graph?.truncated && <span className="ml-1 font-medium text-amber-600">Truncated — too many nodes to show at once; narrow the filters.</span>}
      </p>

      <div className="relative h-[640px] rounded-md border bg-muted/10">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : flowNodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No connected entries match these filters.</div>
        ) : (
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={GRAPH_NODE_TYPES}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgeClick={onEdgeClick}
            onConnect={onConnect}
            fitView
            minZoom={0.1}
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable nodeColor={(n) => (n.data as unknown as GraphNodeData).color} />
          </ReactFlow>
        )}
        {selectedEdgeCode && (
          <GraphEdgeEditor
            code={selectedEdgeCode}
            onClose={() => setSelectedEdgeCode(null)}
            onChanged={() => setRefreshKey(k => k + 1)}
          />
        )}
        {pendingConnect && (
          <GraphConnectForm
            fromCode={pendingConnect.from}
            toCode={pendingConnect.to}
            onClose={() => setPendingConnect(null)}
            onCreated={() => setRefreshKey(k => k + 1)}
          />
        )}
      </div>
    </div>
  );
}
