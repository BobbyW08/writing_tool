import 'server-only'
import { eq, desc, inArray, like, or, isNotNull } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { CODE_REGEX, CODE_PREFIX_CHARS, ENTITY_SLUGS, PREFIX_TO_SLUG } from '@/lib/codes'
import type {
  characters, locations, items, cultures, factions, races, languages,
  lore, events, stories,
} from '@/db/schema'

// ─── UNK helper ──────────────────────────────────────────────────────────────
export const UNK_TAG_ID_CACHE: { id: number | null } = { id: null }

export function isUnk(tagIds: number[] | null | undefined): boolean {
  if (!tagIds || !UNK_TAG_ID_CACHE.id) return false
  return tagIds.includes(UNK_TAG_ID_CACHE.id)
}

export async function getUnkTagId(): Promise<number | null> {
  if (UNK_TAG_ID_CACHE.id) return UNK_TAG_ID_CACHE.id
  const rows = await appDb.select({ id: schema.tags.id }).from(schema.tags)
    .where(eq(schema.tags.name, 'UNK')).limit(1)
  if (rows[0]) UNK_TAG_ID_CACHE.id = rows[0].id
  return UNK_TAG_ID_CACHE.id
}

// ─── Table map ───────────────────────────────────────────────────────────────
// All world-entry tables have the same base columns. We use 'as never' casts
// to query any of them generically without repeating function bodies 8 times.

type WorldTable = typeof schema.characters
type AnyWorldTable = { [K in keyof WorldTable]: WorldTable[K] }

const WORLD_TABLE_MAP: Record<string, AnyWorldTable> = {
  characters: schema.characters as unknown as AnyWorldTable,
  locations: schema.locations as unknown as AnyWorldTable,
  items: schema.items as unknown as AnyWorldTable,
  cultures: schema.cultures as unknown as AnyWorldTable,
  factions: schema.factions as unknown as AnyWorldTable,
  races: schema.races as unknown as AnyWorldTable,
  languages: schema.languages as unknown as AnyWorldTable,
  lore: schema.lore as unknown as AnyWorldTable,
  eras: schema.eras as unknown as AnyWorldTable,
}

function getWorldTable(collection: string) {
  return WORLD_TABLE_MAP[collection] ?? null
}

// ─── Tag enrichment ──────────────────────────────────────────────────────────
export type ResolvedTag = { id: number; code: string; name: string }

let ALL_TAGS_CACHE: ResolvedTag[] | null = null

async function getAllTags(): Promise<ResolvedTag[]> {
  if (ALL_TAGS_CACHE) return ALL_TAGS_CACHE
  ALL_TAGS_CACHE = await appDb.select({
    id: schema.tags.id, code: schema.tags.code, name: schema.tags.name,
  }).from(schema.tags)
  if (!UNK_TAG_ID_CACHE.id) {
    UNK_TAG_ID_CACHE.id = ALL_TAGS_CACHE.find(t => t.name === 'UNK')?.id ?? null
  }
  return ALL_TAGS_CACHE
}

function resolveTagIds(tagIds: number[] | null | undefined): ResolvedTag[] {
  const ids = tagIds ?? []
  if (!ids.length || !ALL_TAGS_CACHE) return []
  return ALL_TAGS_CACHE.filter(t => ids.includes(t.id))
}

// ─── Media enrichment ────────────────────────────────────────────────────────
export type ImageInfo = {
  id: number
  url: string | null
  alt: string | null
  filename: string | null
  sizes: { thumbnail?: { url: string | null } | null }
}

async function resolveMedia(imageId: number | null | undefined): Promise<ImageInfo | null> {
  if (!imageId) return null
  const rows = await appDb.select({
    id: schema.media.id, url: schema.media.url, alt: schema.media.alt,
    filename: schema.media.filename, sizes: schema.media.sizes,
  }).from(schema.media).where(eq(schema.media.id, imageId)).limit(1)
  if (!rows[0]) return null
  const m = rows[0]
  const sizes = (m.sizes ?? {}) as Record<string, { url: string; width: number; height: number }>
  return {
    id: m.id,
    url: m.url ?? null,
    alt: m.alt ?? null,
    filename: m.filename ?? null,
    sizes: {
      thumbnail: sizes['thumbnail'] ? { url: sizes['thumbnail'].url } : null,
    },
  }
}

// ─── Parent enrichment ───────────────────────────────────────────────────────
async function resolveParent(
  collection: string,
  parentId: number | null | undefined
): Promise<{ id: number; code: string; name: string } | null> {
  if (!parentId) return null
  if (collection === 'events') {
    const rows = await appDb.select({ id: schema.events.id, code: schema.events.code, name: schema.events.name })
      .from(schema.events).where(eq(schema.events.id, parentId)).limit(1)
    return rows[0] ? { id: rows[0].id, code: rows[0].code, name: rows[0].name } : null
  }
  const table = getWorldTable(collection)
  if (!table) return null
  const rows = await appDb.select({ id: table.id, code: table.code, name: table.name })
    .from(table as never).where(eq(table.id, parentId)).limit(1)
  return rows[0] ? { id: (rows[0] as { id: number }).id, code: (rows[0] as { code: string }).code, name: (rows[0] as { name: string }).name } : null
}

// ─── Enrich a world entry or event row ───────────────────────────────────────
async function enrichWorldRow(row: Record<string, unknown>, collection: string) {
  await getAllTags()
  const tagIds = (row.tagIds ?? []) as number[]
  const [image, parent] = await Promise.all([
    resolveMedia(row.imageId as number | null),
    resolveParent(collection, row.parentId as number | null),
  ])
  return {
    ...row,
    tags: resolveTagIds(tagIds),
    image,
    parent,
  }
}

// ─── getCollectionList ────────────────────────────────────────────────────────
export async function getCollectionList(collection: string) {
  await getAllTags()
  if (collection === 'events') {
    const docs = await appDb.select().from(schema.events)
    return { docs: docs.map(d => ({ ...d, tags: resolveTagIds((d.tagIds ?? []) as number[]) })), totalDocs: docs.length }
  }
  if (collection === 'stories') {
    const docs = await appDb.select().from(schema.stories)
    return { docs: docs.map(d => ({ ...d, tags: resolveTagIds((d.tagIds ?? []) as number[]) })), totalDocs: docs.length }
  }
  if (collection === 'writing') {
    const docs = await appDb.select().from(schema.writing)
    return { docs: docs.map(d => ({ ...d, tags: resolveTagIds((d.tagIds ?? []) as number[]) })), totalDocs: docs.length }
  }
  const table = getWorldTable(collection)
  if (!table) return { docs: [], totalDocs: 0 }
  const docs = await appDb.select().from(table as never)
  return { docs: (docs as Record<string, unknown>[]).map(d => ({ ...d, tags: resolveTagIds((d.tagIds as number[] | null) ?? []) })), totalDocs: docs.length }
}

// ─── getEntryByCode ───────────────────────────────────────────────────────────
export async function getEntryByCode(collection: string, code: string) {
  const upper = code.toUpperCase()
  await getAllTags()

  if (collection === 'events') {
    const rows = await appDb.select().from(schema.events).where(eq(schema.events.code, upper)).limit(1)
    if (!rows[0]) return null
    return enrichWorldRow(rows[0] as unknown as Record<string, unknown>, 'events')
  }
  if (collection === 'stories') {
    const rows = await appDb.select().from(schema.stories).where(eq(schema.stories.code, upper)).limit(1)
    if (!rows[0]) return null
    return enrichWorldRow(rows[0] as unknown as Record<string, unknown>, 'stories')
  }
  const table = getWorldTable(collection)
  if (!table) return null
  const rows = await appDb.select().from(table as never).where(eq(table.code, upper)).limit(1)
  if (!rows[0]) return null
  return enrichWorldRow(rows[0] as unknown as Record<string, unknown>, collection)
}

// ─── getEntryBySlug ───────────────────────────────────────────────────────────
export async function getEntryBySlug(collection: string, slug: string) {
  await getAllTags()
  if (collection === 'events') {
    const rows = await appDb.select().from(schema.events).where(eq(schema.events.slug, slug)).limit(1)
    if (!rows[0]) return null
    return enrichWorldRow(rows[0] as unknown as Record<string, unknown>, 'events')
  }
  if (collection === 'stories') {
    const rows = await appDb.select().from(schema.stories).where(eq(schema.stories.slug, slug)).limit(1)
    if (!rows[0]) return null
    return enrichWorldRow(rows[0] as unknown as Record<string, unknown>, 'stories')
  }
  const table = getWorldTable(collection)
  if (!table) return null
  const rows = await appDb.select().from(table as never).where(eq(table.slug, slug)).limit(1)
  if (!rows[0]) return null
  return enrichWorldRow(rows[0] as unknown as Record<string, unknown>, collection)
}

// ─── getSubItems ──────────────────────────────────────────────────────────────
export async function getSubItems(collection: string, parentId: number) {
  const table = getWorldTable(collection)
  if (!table) return []
  const rows = await appDb.select().from(table as never).where(eq(table.parentId, parentId))
  return rows as unknown[]
}

// ─── getRelationshipsByCode ───────────────────────────────────────────────────
export async function getRelationshipsByCode(code: string) {
  const [fromRows, toRows] = await Promise.all([
    appDb.select().from(schema.relationships).where(eq(schema.relationships.fromCode, code)),
    appDb.select().from(schema.relationships).where(eq(schema.relationships.toCode, code)),
  ])
  return { from: fromRows, to: toRows }
}

// ─── getEventsInvolving ───────────────────────────────────────────────────────
export async function getEventsInvolving(entryCollection: string, entryId: number) {
  const involveRows = await appDb.select({ eventId: schema.eventInvolves.eventId })
    .from(schema.eventInvolves)
    .where(
      eq(schema.eventInvolves.entryCollection, entryCollection)
    )
  const filtered = involveRows.filter(r => {
    const rows2 = appDb.select({ entryId: schema.eventInvolves.entryId })
      .from(schema.eventInvolves)
      .where(eq(schema.eventInvolves.eventId, r.eventId))
    return true
  })
  // Re-query directly
  const involves = await appDb.select({ eventId: schema.eventInvolves.eventId })
    .from(schema.eventInvolves)
    .where(
      eq(schema.eventInvolves.entryId, entryId)
    )
  if (!involves.length) return []
  const eventIds = involves.map(r => r.eventId)
  const evts = await appDb.select().from(schema.events).where(inArray(schema.events.id, eventIds))
  return evts
}

// ─── getEventsList ────────────────────────────────────────────────────────────
export async function getEventsList() {
  const docs = await appDb.select().from(schema.events)
    .orderBy(schema.events.startYear)
  return { docs, totalDocs: docs.length }
}

// ─── getEventByCode ───────────────────────────────────────────────────────────
export async function getEventByCode(code: string) {
  await getAllTags()
  const rows = await appDb.select().from(schema.events).where(eq(schema.events.code, code.toUpperCase())).limit(1)
  if (!rows[0]) return null
  return enrichWorldRow(rows[0] as unknown as Record<string, unknown>, 'events')
}

// ─── getEventBySlug ───────────────────────────────────────────────────────────
export async function getEventBySlug(slug: string) {
  await getAllTags()
  const rows = await appDb.select().from(schema.events).where(eq(schema.events.slug, slug)).limit(1)
  if (!rows[0]) return null
  return enrichWorldRow(rows[0] as unknown as Record<string, unknown>, 'events')
}

// ─── getConvergenceCandidates ─────────────────────────────────────────────────
// Everything that can appear in an event's `involves` (any world entry — not events or stories
// themselves), for the multi-lane convergence view's entry picker.
export async function getConvergenceCandidates(): Promise<{ code: string; name: string; collection: string }[]> {
  const { WORLD_SLUGS } = await import('@/lib/codes')
  const results = await Promise.all(WORLD_SLUGS.map(async (collection) => {
    const table = getWorldTable(collection)
    if (!table) return []
    const rows = await appDb.select({ code: table.code, name: table.name }).from(table as never)
    return (rows as { code: string; name: string }[]).map(r => ({ ...r, collection }))
  }))
  return results.flat()
}

// ─── getEventsForConvergence ──────────────────────────────────────────────────
// Every placed event with its `involves` list resolved to codes, for the multi-lane
// convergence view (lib/convergence/). Not the generic event list — this exists only to
// answer "which selected entries does this event involve."
export async function getEventsForConvergence(): Promise<{
  code: string; name: string; startYear: number; involvesCodes: string[]
}[]> {
  const [events, involveRows] = await Promise.all([
    appDb.select({ id: schema.events.id, code: schema.events.code, name: schema.events.name, startYear: schema.events.startYear })
      .from(schema.events).where(isNotNull(schema.events.startYear)),
    appDb.select().from(schema.eventInvolves),
  ])

  const byEvent = new Map<number, { entryCollection: string; entryId: number }[]>()
  for (const r of involveRows) {
    const list = byEvent.get(r.eventId) ?? []
    list.push({ entryCollection: r.entryCollection, entryId: r.entryId })
    byEvent.set(r.eventId, list)
  }

  const idsByCollection = new Map<string, Set<number>>()
  for (const rows of byEvent.values()) {
    for (const r of rows) {
      const set = idsByCollection.get(r.entryCollection) ?? new Set<number>()
      set.add(r.entryId)
      idsByCollection.set(r.entryCollection, set)
    }
  }

  const codeOf = new Map<string, string>() // `${collection}:${id}` -> code
  await Promise.all(Array.from(idsByCollection.entries()).map(async ([collection, ids]) => {
    const table = getWorldTable(collection)
    if (!table) return
    const rows = await appDb.select({ id: table.id, code: table.code })
      .from(table as never).where(inArray(table.id, [...ids]))
    for (const row of rows as { id: number; code: string }[]) codeOf.set(`${collection}:${row.id}`, row.code)
  }))

  return events.map(e => ({
    code: e.code, name: e.name, startYear: e.startYear!,
    involvesCodes: (byEvent.get(e.id) ?? [])
      .map(r => codeOf.get(`${r.entryCollection}:${r.entryId}`))
      .filter((c): c is string => !!c),
  }))
}

// ─── getErasList ──────────────────────────────────────────────────────────────
export async function getErasList() {
  const docs = await appDb.select().from(schema.eras).orderBy(schema.eras.startYear)
  return { docs, totalDocs: docs.length }
}

// ─── getTimelineSettings ──────────────────────────────────────────────────────
export async function getTimelineSettings() {
  const rows = await appDb.select().from(schema.timelineSettings).where(eq(schema.timelineSettings.id, 1)).limit(1)
  if (rows[0]) return rows[0]
  return {
    id: 1, scaleMode: 'to_scale' as const, gaps: [] as { fromYear: number; toYear: number; collapsedTo: number; label: string }[],
    defaultZoomStart: null, defaultZoomEnd: null, updatedAt: new Date(),
  }
}

// ─── getLocationRef ───────────────────────────────────────────────────────────
export async function getLocationRef(id: number | null | undefined) {
  if (!id) return null
  const rows = await appDb.select({ code: schema.locations.code, name: schema.locations.name })
    .from(schema.locations).where(eq(schema.locations.id, id)).limit(1)
  return rows[0] ?? null
}

// ─── getStoriesList ───────────────────────────────────────────────────────────
export async function getStoriesList() {
  const docs = await appDb.select().from(schema.stories).orderBy(schema.stories.code)
  return { docs, totalDocs: docs.length }
}

// ─── getStoryByCode ───────────────────────────────────────────────────────────
export async function getStoryByCode(code: string) {
  await getAllTags()
  const rows = await appDb.select().from(schema.stories).where(eq(schema.stories.code, code.toUpperCase())).limit(1)
  if (!rows[0]) return null
  return enrichWorldRow(rows[0] as unknown as Record<string, unknown>, 'stories')
}

// ─── getUnkRecords ────────────────────────────────────────────────────────────
export async function getUnkRecords() {
  const unkId = await getUnkTagId()
  if (!unkId) return []
  await getAllTags()

  const allCollections = [...ENTITY_SLUGS, 'relationships'] as string[]
  const results: { collection: string; docs: Record<string, unknown>[]; totalDocs: number }[] = []

  for (const col of allCollections) {
    let rows: Record<string, unknown>[] = []
    if (col === 'relationships') {
      const all = await appDb.select({ id: schema.relationships.id, code: schema.relationships.code, name: schema.relationships.title, tagIds: schema.relationships.tagIds, reviewNote: schema.relationships.reviewNote, updatedAt: schema.relationships.updatedAt }).from(schema.relationships)
      rows = (all as Record<string, unknown>[]).filter(r => ((r.tagIds as number[] | null) ?? []).includes(unkId))
    } else if (col === 'events') {
      const all = await appDb.select({ id: schema.events.id, code: schema.events.code, name: schema.events.name, tagIds: schema.events.tagIds, reviewNote: schema.events.reviewNote, updatedAt: schema.events.updatedAt }).from(schema.events)
      rows = (all as Record<string, unknown>[]).filter(r => ((r.tagIds as number[] | null) ?? []).includes(unkId))
    } else if (col === 'stories') {
      const all = await appDb.select({ id: schema.stories.id, code: schema.stories.code, name: schema.stories.name, tagIds: schema.stories.tagIds, reviewNote: schema.stories.reviewNote, updatedAt: schema.stories.updatedAt }).from(schema.stories)
      rows = (all as Record<string, unknown>[]).filter(r => ((r.tagIds as number[] | null) ?? []).includes(unkId))
    } else if (col === 'writing') {
      const all = await appDb.select({ id: schema.writing.id, code: schema.writing.code, name: schema.writing.name, tagIds: schema.writing.tagIds, reviewNote: schema.writing.reviewNote, updatedAt: schema.writing.updatedAt }).from(schema.writing)
      rows = (all as Record<string, unknown>[]).filter(r => ((r.tagIds as number[] | null) ?? []).includes(unkId))
    } else {
      const table = getWorldTable(col)
      if (!table) continue
      const all = await appDb.select({ id: table.id, code: table.code, name: table.name, tagIds: table.tagIds, reviewNote: table.reviewNote, updatedAt: table.updatedAt }).from(table as never)
      rows = (all as Record<string, unknown>[]).filter(r => ((r.tagIds as number[] | null) ?? []).includes(unkId))
    }
    if (rows.length > 0) {
      results.push({ collection: col, docs: rows, totalDocs: rows.length })
    }
  }

  return results
}

// ─── buildCodeMap ─────────────────────────────────────────────────────────────
export async function buildCodeMap(texts: (string | null | undefined)[]): Promise<Record<string, { name: string; collection: string } | null>> {
  const codes = new Set<string>()
  for (const text of texts) {
    if (!text) continue
    const re = new RegExp(CODE_REGEX.source, 'g')
    for (const m of text.matchAll(re)) codes.add(`${m[1]}${m[2]}`)
  }
  if (codes.size === 0) return {}

  const byCollection = new Map<string, string[]>()
  for (const code of codes) {
    const collection = PREFIX_TO_SLUG[code[0]]
    if (!collection || collection === 'relationships' || collection === 'continuity-flags' || collection === 'tags') continue
    if (!byCollection.has(collection)) byCollection.set(collection, [])
    byCollection.get(collection)!.push(code)
  }

  const map: Record<string, { name: string; collection: string } | null> = {}

  await Promise.all(Array.from(byCollection.entries()).map(async ([collection, codeBatch]) => {
    try {
      let rows: { code: string; name: string }[] = []
      if (collection === 'events') {
        const r = await appDb.select({ code: schema.events.code, name: schema.events.name }).from(schema.events).where(inArray(schema.events.code, codeBatch))
        rows = r
      } else if (collection === 'stories') {
        const r = await appDb.select({ code: schema.stories.code, name: schema.stories.name }).from(schema.stories).where(inArray(schema.stories.code, codeBatch))
        rows = r
      } else if (collection === 'writing') {
        const r = await appDb.select({ code: schema.writing.code, name: schema.writing.name }).from(schema.writing).where(inArray(schema.writing.code, codeBatch))
        rows = r
      } else {
        const table = getWorldTable(collection)
        if (!table) return
        const r = await appDb.select({ code: table.code, name: table.name }).from(table as never).where(inArray(table.code, codeBatch))
        rows = r as { code: string; name: string }[]
      }
      for (const row of rows) {
        map[row.code] = { name: row.name, collection }
      }
    } catch {
      // skip unresolvable collections
    }
  }))

  for (const code of codes) {
    if (!(code in map)) map[code] = null
  }

  return map
}

// ─── getWorldTreeNodes ────────────────────────────────────────────────────────
export async function getWorldTreeNodes() {
  const WORLD_COLS = ['characters', 'locations', 'items', 'cultures', 'factions', 'races', 'languages', 'lore'] as const
  const ALL_COLS = [...WORLD_COLS, 'events', 'stories'] as const

  type RawRow = {
    id: number; code: string; name: string; parentId: number | null;
    imageId: number | null; updatedAt: Date;
    cultureId?: number | null;
    era?: string | null;
  }

  const results = await Promise.all([
    ...WORLD_COLS.map(col => {
      const table = getWorldTable(col)
      return appDb.select({ id: table!.id, code: table!.code, name: table!.name, parentId: table!.parentId, imageId: table!.imageId, updatedAt: table!.updatedAt }).from(table as never)
    }),
    appDb.select({ id: schema.events.id, code: schema.events.code, name: schema.events.name, parentId: schema.events.parentId, imageId: schema.events.imageId, updatedAt: schema.events.updatedAt }).from(schema.events),
    appDb.select({ id: schema.stories.id, code: schema.stories.code, name: schema.stories.name, parentId: schema.stories.id, imageId: schema.stories.imageId, era: schema.stories.era, updatedAt: schema.stories.updatedAt }).from(schema.stories),
  ])

  // Batch-fetch media thumbnails for all imageIds in one query
  const allImageIds = (results.flat() as RawRow[]).map(r => r.imageId).filter(Boolean) as number[]
  const mediaMap = new Map<number, string | null>()
  if (allImageIds.length > 0) {
    const mediaRows = await appDb.select({ id: schema.media.id, url: schema.media.url, sizes: schema.media.sizes })
      .from(schema.media)
      .where(inArray(schema.media.id, allImageIds))
    for (const m of mediaRows) {
      const sizes = (m.sizes ?? {}) as Record<string, { url: string }>
      mediaMap.set(m.id, sizes['thumbnail']?.url ?? m.url ?? null)
    }
  }

  // Batch-fetch codes for parent IDs
  const parentIds = (results.flat() as RawRow[]).map(r => r.parentId).filter(Boolean) as number[]
  const parentCodeMap = new Map<number, string>()
  if (parentIds.length > 0) {
    for (let i = 0; i < ALL_COLS.length; i++) {
      const col = ALL_COLS[i]
      const table = col === 'events' ? schema.events : col === 'stories' ? schema.stories : getWorldTable(col)
      if (!table) continue
      const pRows = await appDb.select({ id: table.id, code: table.code }).from(table as never).where(inArray(table.id, parentIds))
      for (const r of pRows as { id: number; code: string }[]) parentCodeMap.set(r.id, r.code)
    }
  }

  const nodes: {
    id: number; code: string; name: string; collection: string;
    parentId?: number | null; parentCode?: string | null;
    storyCode?: string | null; cultureCode?: string | null; era?: string | null;
    image?: string | null;
  }[] = []

  for (let i = 0; i < ALL_COLS.length; i++) {
    const col = ALL_COLS[i]
    for (const row of results[i] as RawRow[]) {
      nodes.push({
        id: row.id,
        code: row.code,
        name: row.name,
        collection: col,
        parentId: row.parentId ?? null,
        parentCode: row.parentId ? (parentCodeMap.get(row.parentId) ?? null) : null,
        cultureCode: null, // cultureId -> code batch fetch not included for perf
        era: (row as { era?: string | null }).era ?? null,
        image: row.imageId ? (mediaMap.get(row.imageId) ?? null) : null,
      })
    }
  }

  return nodes
}

// ─── resolveCodeLookup ────────────────────────────────────────────────────────
export async function resolveCodeLookup(query: string): Promise<{ code: string; collection: string; name: string } | null> {
  const q = query.trim().toUpperCase()
  // Built from the same prefix chars as CODE_REGEX, so a new prefix only needs adding in one place.
  const re = new RegExp(`^[${CODE_PREFIX_CHARS}]\\d{1,6}$`)
  if (re.test(q)) {
    const collection = PREFIX_TO_SLUG[q[0]]
    if (collection && ENTITY_SLUGS.includes(collection as never)) {
      const doc = await getEntryByCode(collection, q)
      if (doc) return { code: q, collection, name: String((doc as Record<string, unknown>).name ?? q) }
    }
  }
  // Name search
  const searchCollections = ENTITY_SLUGS
  for (const collection of searchCollections) {
    const table = collection === 'events' ? null : collection === 'stories' ? null : getWorldTable(collection)
    let result: { code: string; name: string } | null = null
    if (collection === 'events') {
      const rows = await appDb.select({ code: schema.events.code, name: schema.events.name }).from(schema.events).where(like(schema.events.name, `%${query}%`)).limit(1)
      result = rows[0] ?? null
    } else if (collection === 'stories') {
      const rows = await appDb.select({ code: schema.stories.code, name: schema.stories.name }).from(schema.stories).where(like(schema.stories.name, `%${query}%`)).limit(1)
      result = rows[0] ?? null
    } else if (table) {
      const rows = await appDb.select({ code: table.code, name: table.name }).from(table as never).where(like(table.name, `%${query}%`)).limit(1)
      result = (rows[0] as { code: string; name: string }) ?? null
    }
    if (result?.code) return { code: result.code, collection, name: result.name }
  }
  return null
}

// ─── Home hub helpers ─────────────────────────────────────────────────────────
export async function getCollectionCount(collection: string): Promise<number> {
  if (collection === 'events') {
    const rows = await appDb.select({ id: schema.events.id }).from(schema.events)
    return rows.length
  }
  if (collection === 'stories') {
    const rows = await appDb.select({ id: schema.stories.id }).from(schema.stories)
    return rows.length
  }
  const table = getWorldTable(collection)
  if (!table) return 0
  const rows = await appDb.select({ id: table.id }).from(table as never)
  return (rows as { id: number }[]).length
}

export async function getCollectionUnkCount(collection: string): Promise<number> {
  const unkId = await getUnkTagId()
  if (!unkId) return 0
  const list = await getCollectionList(collection)
  return list.docs.filter(d => {
    const tagIds = (d as Record<string, unknown>).tagIds as number[] | null
    return (tagIds ?? []).includes(unkId)
  }).length
}

export async function getCollectionPlaceholderCount(collection: string): Promise<number> {
  const list = await getCollectionList(collection)
  return list.docs.filter(d => {
    const status = (d as Record<string, unknown>).status as string
    return status === 'placeholder' || status === 'needs_name'
  }).length
}

export async function getRecentEdits(limit = 10): Promise<{
  id: number; code: string; name: string; collection: string; updatedAt: string
}[]> {
  const ALL = [
    { col: 'characters', table: schema.characters },
    { col: 'locations', table: schema.locations },
    { col: 'items', table: schema.items },
    { col: 'cultures', table: schema.cultures },
    { col: 'factions', table: schema.factions },
    { col: 'races', table: schema.races },
    { col: 'languages', table: schema.languages },
    { col: 'lore', table: schema.lore },
    { col: 'events', table: schema.events },
    { col: 'stories', table: schema.stories },
  ] as const

  type Row = { id: number; code: string; name: string; updatedAt: Date }
  const results: { id: number; code: string; name: string; collection: string; updatedAt: string }[] = []

  await Promise.all(ALL.map(async ({ col, table }) => {
    const rows = await appDb.select({ id: table.id, code: table.code, name: table.name, updatedAt: table.updatedAt })
      .from(table as never)
      .orderBy(desc(table.updatedAt))
      .limit(5)
    for (const r of rows as Row[]) {
      results.push({ id: r.id, code: r.code, name: r.name, collection: col, updatedAt: r.updatedAt.toISOString() })
    }
  }))

  return results
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit)
}
