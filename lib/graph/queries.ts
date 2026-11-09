// Read-side helpers over the `links` index. Pure reads — nothing here ever writes a link row
// (that's lib/graph/sync.ts's job). Backs app/api/codes/:code/links and app/api/graph/*.

import { and, eq, or, inArray } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { PREFIX_TO_SLUG, ENTITY_SLUGS } from '@/lib/codes'
import { toNode, toEdge, type Node, type Edge, type Graph, type GraphDoc } from '@/lib/graph/types'
import { getEntryByCode, getEventByCode, getStoryByCode, getCollectionList } from '@/lib/world/queries'

const GRAPH_COLLECTIONS = [...ENTITY_SLUGS] as string[] // characters..lore, events, stories, writing

async function loadGraphDoc(code: string): Promise<{ collection: string; doc: GraphDoc } | null> {
  const collection = PREFIX_TO_SLUG[code[0]]
  if (!collection || !GRAPH_COLLECTIONS.includes(collection)) return null

  if (collection === 'events') {
    const doc = await getEventByCode(code)
    return doc ? { collection, doc: doc as unknown as GraphDoc } : null
  }
  if (collection === 'stories') {
    const doc = await getStoryByCode(code)
    return doc ? { collection, doc: doc as unknown as GraphDoc } : null
  }
  if (collection === 'writing') {
    const rows = await appDb.select().from(schema.writing).where(eq(schema.writing.code, code)).limit(1)
    const row = rows[0]
    if (!row) return null
    return { collection, doc: { code: row.code, name: row.name, status: row.canonState } as GraphDoc }
  }
  const doc = await getEntryByCode(collection, code)
  return doc ? { collection, doc: doc as unknown as GraphDoc } : null
}

// ─── What links here ──────────────────────────────────────────────────────────

export type LinkEntry = {
  edge: Edge
  direction: 'outward' | 'inward'
  label: string // edge.label from `code`'s own side, or edge.inverseLabel from the other side
  other: Node
}

// Every live (non-broken) connection touching `code`, both directions, with the label read from
// `code`'s own side. See traveler-wiki-build-plan.md "Link index" > "Reading it".
export async function getLinksForCode(code: string): Promise<LinkEntry[]> {
  const rows = await appDb.select().from(schema.links).where(
    and(eq(schema.links.broken, false), or(eq(schema.links.fromCode, code), eq(schema.links.toCode, code)))
  )

  const otherCodes = new Set<string>()
  for (const row of rows) otherCodes.add(row.fromCode === code ? row.toCode : row.fromCode)

  const nodeByCode = new Map<string, Node>()
  await Promise.all([...otherCodes].map(async (c) => {
    const loaded = await loadGraphDoc(c)
    if (loaded) nodeByCode.set(c, toNode(loaded.collection, loaded.doc))
  }))

  const entries: LinkEntry[] = []
  for (const row of rows) {
    const outward = row.fromCode === code
    const otherCode = outward ? row.toCode : row.fromCode
    const other = nodeByCode.get(otherCode)
    if (!other) continue
    const edge = toEdge(row)
    entries.push({ edge, direction: outward ? 'outward' : 'inward', label: outward ? edge.label : edge.inverseLabel, other })
  }
  return entries
}

// ─── Graph outward from one record, breadth first ────────────────────────────

const GRAPH_NODE_CAP = 300

export type GraphFromCodeOptions = {
  depth?: number
  direction?: 'both' | 'out' | 'in'
  sources?: string[]
  types?: string[]
  collections?: string[]
}

export async function getGraphFromCode(code: string, opts: GraphFromCodeOptions = {}): Promise<Graph> {
  const depth = opts.depth ?? 2
  const direction = opts.direction ?? 'both'

  const nodesByCode = new Map<string, Node>()
  const edgesByKey = new Map<string, Edge>()
  const visited = new Set<string>()
  let frontier = new Set<string>([code])
  let truncated = false

  for (let d = 0; d <= depth && frontier.size > 0; d++) {
    const next = new Set<string>()
    for (const c of frontier) {
      if (visited.has(c)) continue
      visited.add(c)

      if (!nodesByCode.has(c)) {
        if (nodesByCode.size >= GRAPH_NODE_CAP) { truncated = true; continue }
        const loaded = await loadGraphDoc(c)
        if (loaded) nodesByCode.set(c, toNode(loaded.collection, loaded.doc))
      }

      const rows = await appDb.select().from(schema.links).where(
        and(eq(schema.links.broken, false), or(eq(schema.links.fromCode, c), eq(schema.links.toCode, c)))
      )
      for (const row of rows) {
        if (opts.sources?.length && !opts.sources.includes(row.source)) continue
        if (opts.types?.length && !opts.types.includes(row.type)) continue
        const outward = row.fromCode === c
        if (direction === 'out' && !outward) continue
        if (direction === 'in' && outward) continue
        const other = outward ? row.toCode : row.fromCode
        const otherCollection = outward ? row.toCollection : row.fromCollection
        if (opts.collections?.length && !opts.collections.includes(otherCollection)) continue

        const edge = toEdge(row)
        edgesByKey.set(edge.id, edge)
        if (!visited.has(other)) {
          if (nodesByCode.size + next.size >= GRAPH_NODE_CAP) truncated = true
          else next.add(other)
        }
      }
    }
    frontier = next
  }

  return { nodes: [...nodesByCode.values()], edges: [...edgesByKey.values()], truncated }
}

// ─── A whole or filtered graph ────────────────────────────────────────────────

export type FilteredGraphOptions = {
  collections?: string[]
  tags?: string[] // tag names
  yearFrom?: number
  yearTo?: number
}

export async function getFilteredGraph(opts: FilteredGraphOptions = {}): Promise<Graph> {
  const targetCollections = opts.collections?.length ? opts.collections : GRAPH_COLLECTIONS

  const nodes: Node[] = []
  for (const collection of targetCollections) {
    const { docs } = await getCollectionList(collection)
    for (const doc of docs as unknown as GraphDoc[]) nodes.push(toNode(collection, doc))
  }

  const filtered = nodes.filter((n) => {
    if (opts.tags?.length && !opts.tags.some(t => n.tags.includes(t))) return false
    if (opts.yearFrom !== undefined && (n.startYear ?? n.endYear) !== undefined && (n.startYear ?? n.endYear ?? 0) < opts.yearFrom) return false
    if (opts.yearTo !== undefined && (n.endYear ?? n.startYear) !== undefined && (n.endYear ?? n.startYear ?? 0) > opts.yearTo) return false
    return true
  })

  const codes = new Set(filtered.map(n => n.code))
  const linkRows = await appDb.select().from(schema.links).where(eq(schema.links.broken, false))
  const edges = linkRows.filter(r => codes.has(r.fromCode) && codes.has(r.toCode)).map(toEdge)

  return { nodes: filtered, edges, truncated: false }
}

// ─── Orphans: records with no connections ────────────────────────────────────

export async function getOrphanCodes(): Promise<{ code: string; collection: string; name: string }[]> {
  const linkedCodes = new Set<string>()
  const rows = await appDb.select({ fromCode: schema.links.fromCode, toCode: schema.links.toCode }).from(schema.links)
  for (const r of rows) { linkedCodes.add(r.fromCode); linkedCodes.add(r.toCode) }

  const orphans: { code: string; collection: string; name: string }[] = []
  for (const collection of GRAPH_COLLECTIONS) {
    const { docs } = await getCollectionList(collection)
    for (const doc of docs as unknown as { code: string; name: string }[]) {
      if (!linkedCodes.has(doc.code)) orphans.push({ code: doc.code, collection, name: doc.name })
    }
  }
  return orphans
}

// ─── Broken connections ───────────────────────────────────────────────────────

export async function getBrokenLinks(): Promise<Edge[]> {
  const rows = await appDb.select().from(schema.links).where(eq(schema.links.broken, true))
  return rows.map(toEdge)
}

// Whether a code still resolves to a live record — used by the link-health page to show which
// side of a broken edge is the one that was deleted.
export async function codeStillExists(code: string): Promise<boolean> {
  return (await loadGraphDoc(code)) !== null
}

// ─── Shortest path between two records ────────────────────────────────────────

export async function getShortestPath(from: string, to: string): Promise<Edge[] | null> {
  if (from === to) return []
  const cameFrom = new Map<string, { prevCode: string; edge: Edge }>()
  const visited = new Set<string>([from])
  let frontier = [from]

  while (frontier.length > 0) {
    const codes = frontier
    frontier = []
    const rows = await appDb.select().from(schema.links).where(
      and(eq(schema.links.broken, false), or(inArray(schema.links.fromCode, codes), inArray(schema.links.toCode, codes)))
    )
    for (const row of rows) {
      for (const c of codes) {
        if (row.fromCode !== c && row.toCode !== c) continue
        const other = row.fromCode === c ? row.toCode : row.fromCode
        if (visited.has(other)) continue
        visited.add(other)
        cameFrom.set(other, { prevCode: c, edge: toEdge(row) })
        if (other === to) {
          const path: Edge[] = []
          let cur = to
          while (cur !== from) {
            const step = cameFrom.get(cur)!
            path.unshift(step.edge)
            cur = step.prevCode
          }
          return path
        }
        frontier.push(other)
      }
    }
  }
  return null
}
