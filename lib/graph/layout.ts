// Pure layout helpers over the Graph shape (lib/graph/types.ts). No framework imports beyond
// dagre — components/node-map-view.tsx and relationship-view.tsx turn the output into
// @xyflow/react nodes/edges.

import dagre from 'dagre'
import type { Node, Edge } from '@/lib/graph/types'
import { RELATIONSHIP_TYPES } from '@/lib/relationshipTypes'

export const NODE_WIDTH = 180
export const NODE_HEIGHT = 44

// Layered layout for the full node map: every node and edge, positioned left-to-right by dagre.
// Nodes with no edges at all are dropped into a grid below the graph (dagre ignores isolates).
export function layoutNodeMap(nodes: Node[], edges: Edge[]): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 30, ranksep: 90, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))

  const connected = new Set<string>()
  for (const e of edges) { connected.add(e.from); connected.add(e.to) }

  for (const n of nodes) {
    if (connected.has(n.code)) g.setNode(n.code, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const e of edges) {
    if (g.hasNode(e.from) && g.hasNode(e.to)) g.setEdge(e.from, e.to)
  }
  dagre.layout(g)

  const positions = new Map<string, { x: number; y: number }>()
  let maxY = 0
  for (const n of nodes) {
    if (connected.has(n.code)) {
      const p = g.node(n.code)
      if (p) {
        positions.set(n.code, { x: p.x - NODE_WIDTH / 2, y: p.y - NODE_HEIGHT / 2 })
        maxY = Math.max(maxY, p.y)
      }
    }
  }

  // isolates: grid them below everything else so they're visible but out of the way
  const isolates = nodes.filter(n => !connected.has(n.code))
  const gridY = maxY + NODE_HEIGHT * 2
  const perRow = 6
  isolates.forEach((n, i) => {
    positions.set(n.code, {
      x: (i % perRow) * (NODE_WIDTH + 30),
      y: gridY + Math.floor(i / perRow) * (NODE_HEIGHT + 20),
    })
  })

  return positions
}

const GROUP_ORDER = [...new Set(RELATIONSHIP_TYPES.map(t => t.group as string))]
const GROUP_INDEX = new Map<string, number>(GROUP_ORDER.map((g, i) => [g, i]))
const TYPE_TO_GROUP = new Map<string, string>(RELATIONSHIP_TYPES.map(t => [t.value as string, t.group as string]))
const TYPE_TO_HIERARCHY = new Map<string, string>(RELATIONSHIP_TYPES.map(t => [t.value as string, t.hierarchy as string]))

export type RelatedNode = { node: Node; edge: Edge; direction: 'outward' | 'inward'; label: string }

// Entry-centered layout for the per-record relationship view: the entry sits at the origin,
// everything else is grouped into columns by relationship type (field/parent/text edges get
// their own catch-all columns), fanned out left/right of center. Within the Family column,
// `hierarchy` orders parents above the center and children below it, approximating a tree.
export function layoutRelationshipView(
  centerCode: string,
  related: RelatedNode[],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  positions.set(centerCode, { x: 0, y: 0 })

  function groupFor(r: RelatedNode): string {
    if (r.edge.source === 'relationship') return TYPE_TO_GROUP.get(r.edge.type) ?? 'Other'
    if (r.edge.source === 'parent') return 'Part of / has part'
    if (r.edge.source === 'text') return 'Mentions'
    if (r.edge.source === 'field') return 'Fields'
    return 'Other'
  }

  const byGroup = new Map<string, RelatedNode[]>()
  for (const r of related) {
    const g = groupFor(r)
    const list = byGroup.get(g) ?? []
    list.push(r)
    byGroup.set(g, list)
  }

  const groupNames = [...byGroup.keys()].sort((a, b) => (GROUP_INDEX.get(a) ?? 99) - (GROUP_INDEX.get(b) ?? 99))
  const colGap = NODE_WIDTH + 60
  const rowGap = NODE_HEIGHT + 16
  const half = Math.ceil(groupNames.length / 2)

  groupNames.forEach((group, gi) => {
    const side = gi < half ? -1 : 1
    const col = side === -1 ? gi + 1 : gi - half + 1
    const x = side * col * colGap
    const members = byGroup.get(group)!

    if (group === 'Family') {
      // parents above, center row, everyone else (siblings/spouses/other relatives) below
      const parents = members.filter(r => TYPE_TO_HIERARCHY.get(r.edge.type) === (r.direction === 'outward' ? 'from_is_child' : 'from_is_parent'))
      const children = members.filter(r => TYPE_TO_HIERARCHY.get(r.edge.type) === (r.direction === 'outward' ? 'from_is_parent' : 'from_is_child'))
      const peers = members.filter(r => !parents.includes(r) && !children.includes(r))
      parents.forEach((r, i) => positions.set(r.node.code, { x, y: -rowGap * (parents.length - i) }))
      peers.forEach((r, i) => positions.set(r.node.code, { x, y: i * rowGap - (peers.length - 1) * rowGap / 2 + (parents.length ? rowGap * 0.3 : 0) }))
      children.forEach((r, i) => positions.set(r.node.code, { x, y: rowGap * (i + 1) + (peers.length ? rowGap : 0) }))
      return
    }

    members.forEach((r, i) => {
      const y = (i - (members.length - 1) / 2) * rowGap
      positions.set(r.node.code, { x, y })
    })
  })

  return positions
}

export type RelationshipColumn = { group: string; side: 'left' | 'right'; x: number }

export function relationshipColumns(groupNames: string[]): RelationshipColumn[] {
  const colGap = NODE_WIDTH + 60
  const half = Math.ceil(groupNames.length / 2)
  return groupNames.map((group, gi) => {
    const side = gi < half ? 'left' as const : 'right' as const
    const col = side === 'left' ? gi + 1 : gi - half + 1
    return { group, side, x: (side === 'left' ? -1 : 1) * col * colGap }
  })
}
