import 'server-only'
import { eq, and, desc, inArray, like, or, isNotNull, gte, lte, ne } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { currentCodes } from '@/lib/codes-history'
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
  maps: schema.maps as unknown as AnyWorldTable,
  'map-pins': schema.mapPins as unknown as AnyWorldTable,
  chronicles: schema.chronicles as unknown as AnyWorldTable,
  boards: schema.boards as unknown as AnyWorldTable,
  tables: schema.tables as unknown as AnyWorldTable,
  compilations: schema.compilations as unknown as AnyWorldTable,
  beats: schema.beats as unknown as AnyWorldTable,
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

// Step U4: the table view's per-row tag editor needs every tag to offer as an option.
export async function getTagsList(): Promise<ResolvedTag[]> {
  return getAllTags()
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

// ─── Beats (step S5) ───────────────────────────────────────────────────────────
export async function getBeatsForStory(storyId: number) {
  await getAllTags()
  const rows = await appDb.select().from(schema.beats)
    .where(eq(schema.beats.storyId, storyId)).orderBy(schema.beats.order)
  return rows.map(r => ({ ...r, tags: resolveTagIds((r.tagIds ?? []) as number[]) }))
}

export async function getBeatByCode(code: string) {
  await getAllTags()
  const rows = await appDb.select().from(schema.beats).where(eq(schema.beats.code, code.toUpperCase())).limit(1)
  if (!rows[0]) return null
  return { ...rows[0], tags: resolveTagIds((rows[0].tagIds ?? []) as number[]) }
}

export async function getBeatInvolves(beatId: number) {
  return appDb.select({
    entryCollection: schema.beatInvolves.entryCollection, entryId: schema.beatInvolves.entryId,
  }).from(schema.beatInvolves).where(eq(schema.beatInvolves.beatId, beatId))
}

// ─── getRelationshipsByCode ───────────────────────────────────────────────────
export async function getRelationshipsByCode(code: string) {
  const [fromRows, toRows] = await Promise.all([
    appDb.select().from(schema.relationships).where(eq(schema.relationships.fromCode, code)),
    appDb.select().from(schema.relationships).where(eq(schema.relationships.toCode, code)),
  ])
  return { from: fromRows, to: toRows }
}

// ─── getRelationshipByCode ─────────────────────────────────────────────────────
// Step U5: the edge editor (node map, relationship view) only has a relationship's own X-code
// (lib/graph/types.ts's Edge.relationshipCode) to work from -- this resolves it to the full
// editable row, including the numeric id updateRelationshipAction/deleteRelationshipAction need.
export async function getRelationshipByCode(code: string) {
  const rows = await appDb.select().from(schema.relationships).where(eq(schema.relationships.code, code.toUpperCase())).limit(1)
  return rows[0] ?? null
}

// ─── getEventsInvolving ───────────────────────────────────────────────────────
export async function getEventsInvolving(entryCollection: string, entryId: number) {
  const involves = await appDb.select({ eventId: schema.eventInvolves.eventId })
    .from(schema.eventInvolves)
    .where(and(eq(schema.eventInvolves.entryCollection, entryCollection), eq(schema.eventInvolves.entryId, entryId)))
  if (!involves.length) return []
  const eventIds = involves.map(r => r.eventId)
  const evts = await appDb.select().from(schema.events).where(inArray(schema.events.id, eventIds))
  return evts
}

// ─── getEventsForStory ────────────────────────────────────────────────────────
// Same shape as getEventsInvolving, for a story's own `dramatizes` list (step UX6b, board 10) --
// which events of its own, not which world entries, so it reads storyDramatizes rather than
// eventInvolves.
export async function getEventsForStory(storyId: number) {
  const dramatizes = await appDb.select({ eventId: schema.storyDramatizes.eventId })
    .from(schema.storyDramatizes)
    .where(eq(schema.storyDramatizes.storyId, storyId))
  if (!dramatizes.length) return []
  const eventIds = dramatizes.map(r => r.eventId)
  const evts = await appDb.select().from(schema.events).where(inArray(schema.events.id, eventIds))
  return evts
}

// ─── getStoryInvolvesResolved ──────────────────────────────────────────────────
// Step SB6: the story questions popup's Characters, Locations, Items and Lore questions each read
// one collection of a story's storyInvolves rows, resolved to {id, code, name}. Only the four
// collections those questions cover -- storyInvolves itself is generic across any collection
// (move.ts's type-change logic uses it that way), but nothing else reads it back yet.
const STORY_INVOLVES_TABLES = {
  characters: schema.characters,
  locations: schema.locations,
  items: schema.items,
  lore: schema.lore,
} as const

export async function getStoryInvolvesResolved(
  storyId: number,
  entryCollection: keyof typeof STORY_INVOLVES_TABLES
): Promise<{ id: number; code: string; name: string }[]> {
  const involves = await appDb.select({ entryId: schema.storyInvolves.entryId })
    .from(schema.storyInvolves)
    .where(and(eq(schema.storyInvolves.storyId, storyId), eq(schema.storyInvolves.entryCollection, entryCollection)))
  if (!involves.length) return []
  const ids = involves.map(r => r.entryId)
  const table = STORY_INVOLVES_TABLES[entryCollection]
  return appDb.select({ id: table.id, code: table.code, name: table.name }).from(table).where(inArray(table.id, ids))
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

// ─── getGraphCandidates ────────────────────────────────────────────────────────
// Every coded entry the node map can center on: the 8 world collections plus events and
// stories (writing and eras are graph-addressable too but rarely useful as a search target).
export async function getGraphCandidates(): Promise<{ code: string; name: string; collection: string }[]> {
  const [world, events, stories, maps] = await Promise.all([
    getConvergenceCandidates(),
    appDb.select({ code: schema.events.code, name: schema.events.name }).from(schema.events),
    appDb.select({ code: schema.stories.code, name: schema.stories.name }).from(schema.stories),
    appDb.select({ code: schema.maps.code, name: schema.maps.name }).from(schema.maps),
  ])
  return [
    ...world,
    ...events.map(r => ({ ...r, collection: 'events' })),
    ...stories.map(r => ({ ...r, collection: 'stories' })),
    ...maps.map(r => ({ ...r, collection: 'maps' })),
  ]
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

// ─── Maps (step W3) ────────────────────────────────────────────────────────────
export async function getMapsList() {
  await getAllTags()
  const docs = await appDb.select().from(schema.maps).orderBy(schema.maps.name)
  return {
    docs: docs.map(d => ({ ...d, tags: resolveTagIds((d.tagIds ?? []) as number[]) })),
    totalDocs: docs.length,
  }
}

export type ResolvedLinkEntry = { collection: string; id: number; code: string; name: string }

export async function resolveLinkEntries(
  rows: { entryCollection: string; entryId: number }[]
): Promise<ResolvedLinkEntry[]> {
  const out: ResolvedLinkEntry[] = []
  for (const r of rows) {
    const table = r.entryCollection === 'events' ? schema.events
      : r.entryCollection === 'stories' ? schema.stories
      : getWorldTable(r.entryCollection)
    if (!table) continue
    const found = await appDb.select({ id: table.id, code: table.code, name: table.name })
      .from(table as never).where(eq(table.id, r.entryId)).limit(1) as { id: number; code: string; name: string }[]
    if (found[0]) out.push({ collection: r.entryCollection, id: found[0].id, code: found[0].code, name: found[0].name })
  }
  return out
}

async function buildMapData(map: typeof schema.maps.$inferSelect) {
  const [baseImage, location, allPinRows] = await Promise.all([
    resolveMedia(map.baseImageId),
    getLocationRef(map.locationId),
    appDb.select().from(schema.mapPins).where(eq(schema.mapPins.mapId, map.id)),
  ])
  // geometry is nullable only for the instant between createMapPinAction's two statements
  // (lib/world/actions.ts) — filter out the rare row read in that window rather than render it.
  const pinRows = allPinRows.filter(p => p.geometry != null)

  const layers = (map.layers ?? []) as { name: string; imageId: number; opacity: number; defaultVisible: boolean; order: number }[]
  const resolvedLayers = await Promise.all(
    layers.map(async l => ({ ...l, image: await resolveMedia(l.imageId) }))
  )

  const pins = await Promise.all(
    pinRows.map(async p => {
      const linkRows = await appDb.select({
        entryCollection: schema.mapPinLinks.entryCollection, entryId: schema.mapPinLinks.entryId,
      }).from(schema.mapPinLinks).where(eq(schema.mapPinLinks.mapPinId, p.id))
      const opensMap = p.opensMapId
        ? (await appDb.select({ code: schema.maps.code, name: schema.maps.name })
            .from(schema.maps).where(eq(schema.maps.id, p.opensMapId)).limit(1))[0] ?? null
        : null
      return { ...p, links: await resolveLinkEntries(linkRows), opensMap }
    })
  )

  return {
    ...map,
    tags: resolveTagIds((map.tagIds ?? []) as number[]),
    baseImage,
    location,
    layers: resolvedLayers,
    pinGroups: (map.pinGroups ?? []) as { name: string; color: string; defaultVisible: boolean }[],
    pins,
  }
}

export async function getMapByCode(code: string) {
  await getAllTags()
  const rows = await appDb.select().from(schema.maps).where(eq(schema.maps.code, code.toUpperCase())).limit(1)
  const map = rows[0]
  if (!map) return null
  return buildMapData(map)
}

// Step W4: a chronicle shows several maps (one per mapPeriod, switched by which one an event's
// pin sits on) and needs them all loaded up front so selecting an event never round-trips.
export async function getMapsDataByIds(ids: number[]) {
  if (ids.length === 0) return []
  await getAllTags()
  const rows = await appDb.select().from(schema.maps).where(inArray(schema.maps.id, ids))
  return Promise.all(rows.map(buildMapData))
}

export async function getMapsForLocation(locationId: number) {
  const docs = await appDb.select({ id: schema.maps.id, code: schema.maps.code, name: schema.maps.name })
    .from(schema.maps).where(eq(schema.maps.locationId, locationId))
  return docs
}

export async function getMapCodeById(id: number | null | undefined): Promise<string | null> {
  if (!id) return null
  const rows = await appDb.select({ code: schema.maps.code }).from(schema.maps).where(eq(schema.maps.id, id)).limit(1)
  return rows[0]?.code ?? null
}

export async function getPinsForEntry(entryCollection: string, entryId: number) {
  const rows = await appDb.select({ mapPinId: schema.mapPinLinks.mapPinId })
    .from(schema.mapPinLinks)
    .where(and(eq(schema.mapPinLinks.entryCollection, entryCollection), eq(schema.mapPinLinks.entryId, entryId)))
  if (rows.length === 0) return []
  const pinIds = rows.map(r => r.mapPinId)
  const pins = await appDb.select({
    id: schema.mapPins.id, code: schema.mapPins.code, name: schema.mapPins.name, mapId: schema.mapPins.mapId,
  }).from(schema.mapPins).where(inArray(schema.mapPins.id, pinIds))
  const mapIds = [...new Set(pins.map(p => p.mapId))]
  const maps = mapIds.length > 0
    ? await appDb.select({ id: schema.maps.id, code: schema.maps.code, name: schema.maps.name })
        .from(schema.maps).where(inArray(schema.maps.id, mapIds))
    : []
  const mapById = new Map(maps.map(m => [m.id, m]))
  return pins.map(p => ({ ...p, map: mapById.get(p.mapId) ?? null }))
}

export async function getEventPins(eventId: number) {
  const rows = await appDb.select({ mapPinId: schema.eventPins.mapPinId })
    .from(schema.eventPins).where(eq(schema.eventPins.eventId, eventId))
  if (rows.length === 0) return []
  const pinIds = rows.map(r => r.mapPinId)
  const pins = await appDb.select({
    id: schema.mapPins.id, code: schema.mapPins.code, name: schema.mapPins.name, mapId: schema.mapPins.mapId,
  }).from(schema.mapPins).where(inArray(schema.mapPins.id, pinIds))
  const mapIds = [...new Set(pins.map(p => p.mapId))]
  const maps = mapIds.length > 0
    ? await appDb.select({ id: schema.maps.id, code: schema.maps.code, name: schema.maps.name })
        .from(schema.maps).where(inArray(schema.maps.id, mapIds))
    : []
  const mapById = new Map(maps.map(m => [m.id, m]))
  return pins.map(p => ({ ...p, map: mapById.get(p.mapId) ?? null }))
}

// ─── Chronicles (step W4) ───────────────────────────────────────────────────────
export async function getChroniclesList() {
  await getAllTags()
  const docs = await appDb.select().from(schema.chronicles).orderBy(schema.chronicles.name)
  return {
    docs: docs.map(d => ({ ...d, tags: resolveTagIds((d.tagIds ?? []) as number[]) })),
    totalDocs: docs.length,
  }
}

export type ChronicleMapPeriod = { mapId: number; fromYear: number | null; toYear: number | null; isDefault: boolean }
export type ChronicleFilter = { collections: string[]; tagIds: number[]; involvesCodes: string[] }

export async function getChronicleByCode(code: string) {
  await getAllTags()
  const rows = await appDb.select().from(schema.chronicles).where(eq(schema.chronicles.code, code.toUpperCase())).limit(1)
  const chronicle = rows[0]
  if (!chronicle) return null

  const mapPeriods = (chronicle.mapPeriods ?? []) as ChronicleMapPeriod[]
  const eraIds = (chronicle.eraIds ?? []) as number[]
  const filter = (chronicle.filter ?? { collections: [], tagIds: [], involvesCodes: [] }) as ChronicleFilter

  const mapIds = [...new Set(mapPeriods.map(p => p.mapId))]
  const [maps, eras] = await Promise.all([
    mapIds.length > 0
      ? appDb.select({ id: schema.maps.id, code: schema.maps.code, name: schema.maps.name })
          .from(schema.maps).where(inArray(schema.maps.id, mapIds))
      : Promise.resolve([] as { id: number; code: string; name: string }[]),
    eraIds.length > 0
      ? appDb.select().from(schema.eras).where(inArray(schema.eras.id, eraIds))
      : Promise.resolve([] as (typeof schema.eras.$inferSelect)[]),
  ])
  const mapById = new Map(maps.map(m => [m.id, m]))

  return {
    ...chronicle,
    tags: resolveTagIds((chronicle.tagIds ?? []) as number[]),
    mapPeriods: mapPeriods.map(p => ({ ...p, map: mapById.get(p.mapId) ?? null })),
    eras,
    filter,
  }
}

// Events shown on a chronicle's timeline strip: bounded by its startYear/endYear, narrowed by its
// filter (any of collections/tagIds/involvesCodes — each only applies when non-empty), each with
// its `pins` resolved so the paired map pane knows where to zoom.
export async function getEventsForChronicle(chronicle: {
  startYear: number | null
  endYear: number | null
  filter: ChronicleFilter
}) {
  const conditions = [isNotNull(schema.events.startYear)]
  if (chronicle.startYear != null) conditions.push(gte(schema.events.startYear, chronicle.startYear))
  if (chronicle.endYear != null) conditions.push(lte(schema.events.startYear, chronicle.endYear))

  const events = await appDb.select().from(schema.events).where(and(...conditions)).orderBy(schema.events.startYear)
  if (events.length === 0) return []
  const eventIds = events.map(e => e.id)

  const [involveRows, pinRows] = await Promise.all([
    appDb.select().from(schema.eventInvolves).where(inArray(schema.eventInvolves.eventId, eventIds)),
    appDb.select().from(schema.eventPins).where(inArray(schema.eventPins.eventId, eventIds)),
  ])

  const involvesByEvent = new Map<number, { entryCollection: string; entryId: number }[]>()
  for (const r of involveRows) {
    const list = involvesByEvent.get(r.eventId) ?? []
    list.push({ entryCollection: r.entryCollection, entryId: r.entryId })
    involvesByEvent.set(r.eventId, list)
  }
  const pinIdsByEvent = new Map<number, number[]>()
  for (const r of pinRows) {
    const list = pinIdsByEvent.get(r.eventId) ?? []
    list.push(r.mapPinId)
    pinIdsByEvent.set(r.eventId, list)
  }

  const idsByCollection = new Map<string, Set<number>>()
  for (const rows of involvesByEvent.values()) {
    for (const r of rows) {
      const set = idsByCollection.get(r.entryCollection) ?? new Set<number>()
      set.add(r.entryId)
      idsByCollection.set(r.entryCollection, set)
    }
  }
  const codeOf = new Map<string, string>()
  await Promise.all(Array.from(idsByCollection.entries()).map(async ([collection, ids]) => {
    const table = getWorldTable(collection)
    if (!table) return
    const rows = await appDb.select({ id: table.id, code: table.code })
      .from(table as never).where(inArray(table.id, [...ids]))
    for (const row of rows as { id: number; code: string }[]) codeOf.set(`${collection}:${row.id}`, row.code)
  }))

  const allPinIds = [...new Set(pinRows.map(r => r.mapPinId))]
  const pins = allPinIds.length > 0
    ? await appDb.select({
        id: schema.mapPins.id, code: schema.mapPins.code, name: schema.mapPins.name, mapId: schema.mapPins.mapId,
      }).from(schema.mapPins).where(inArray(schema.mapPins.id, allPinIds))
    : []
  const pinById = new Map(pins.map(p => [p.id, p]))

  const { collections, tagIds, involvesCodes } = chronicle.filter

  return events
    .filter(e => {
      const involves = involvesByEvent.get(e.id) ?? []
      if (collections.length > 0 && !involves.some(r => collections.includes(r.entryCollection))) return false
      if (tagIds.length > 0 && !((e.tagIds ?? []) as number[]).some(t => tagIds.includes(t))) return false
      if (involvesCodes.length > 0) {
        const eventCodes = involves.map(r => codeOf.get(`${r.entryCollection}:${r.entryId}`)).filter((c): c is string => !!c)
        if (!eventCodes.some(c => involvesCodes.includes(c))) return false
      }
      return true
    })
    .map(e => ({
      id: e.id, code: e.code, name: e.name, startYear: e.startYear!,
      eventType: e.eventType, importance: e.importance,
      pins: (pinIdsByEvent.get(e.id) ?? [])
        .map(id => pinById.get(id))
        .filter((p): p is NonNullable<typeof p> => !!p),
    }))
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

// ─── getGapRecords ────────────────────────────────────────────────────────────
// Hard rule 4: any entry whose status is not 'locked' is a normal row, visually flagged, and
// listed here with its gapPrompt so gaps can be resolved in a batch. `writing` has no `status`
// column (it uses `canonState` instead) and `relationships` has no status concept at all, so
// both are excluded here, unlike getUnkRecords above which checks tagIds on every collection.
export async function getGapRecords() {
  const allCollections = ENTITY_SLUGS.filter(s => s !== 'writing') as string[]
  const results: { collection: string; docs: Record<string, unknown>[]; totalDocs: number }[] = []

  for (const col of allCollections) {
    let rows: Record<string, unknown>[] = []
    if (col === 'events') {
      rows = await appDb.select({ id: schema.events.id, code: schema.events.code, name: schema.events.name, status: schema.events.status, gapPrompt: schema.events.gapPrompt, updatedAt: schema.events.updatedAt })
        .from(schema.events).where(ne(schema.events.status, 'locked'))
    } else if (col === 'stories') {
      rows = await appDb.select({ id: schema.stories.id, code: schema.stories.code, name: schema.stories.name, status: schema.stories.status, gapPrompt: schema.stories.gapPrompt, updatedAt: schema.stories.updatedAt })
        .from(schema.stories).where(ne(schema.stories.status, 'locked'))
    } else {
      const table = getWorldTable(col)
      if (!table) continue
      rows = await appDb.select({ id: table.id, code: table.code, name: table.name, status: table.status, gapPrompt: table.gapPrompt, updatedAt: table.updatedAt })
        .from(table as never).where(ne(table.status, 'locked'))
    }
    if (rows.length > 0) {
      rows.sort((a, b) => new Date(b.updatedAt as string).getTime() - new Date(a.updatedAt as string).getTime())
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

  // A code retired by a type change resolves to the entry's current code.
  const moved = await currentCodes([...codes])
  const canon = (code: string) => moved.get(code) ?? code

  const byCollection = new Map<string, string[]>()
  for (const original of codes) {
    const code = canon(original)
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
    map[code] = map[canon(code)] ?? null
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
  let q = query.trim().toUpperCase()
  // Built from the same prefix chars as CODE_REGEX, so a new prefix only needs adding in one place.
  const re = new RegExp(`^[${CODE_PREFIX_CHARS}]\\d{1,6}$`)
  if (re.test(q)) {
    q = (await currentCodes([q])).get(q) ?? q
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

// ─── Search across everything (Phase 8) ───────────────────────────────────────
// By name, alias, or code, across every coded collection. `resolveCodeLookup` above answers "jump
// to the single best match" for the sidebar box; this answers "show me everything that matches"
// for the /search page. A full per-collection table scan (same approach as getUnkRecords and
// getGapRecords above) -- fine at this app's personal, single-user scale.
export type SearchResult = { code: string; collection: string; name: string; status: string }

export async function searchAcrossAll(query: string): Promise<SearchResult[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const upper = query.trim().toUpperCase()

  const results: SearchResult[] = []
  for (const collection of ENTITY_SLUGS) {
    let rows: { code: string; name: string; status: string | null; aliases: unknown }[]
    if (collection === 'events') {
      rows = await appDb.select({ code: schema.events.code, name: schema.events.name, status: schema.events.status, aliases: schema.events.aliases }).from(schema.events)
    } else if (collection === 'stories') {
      rows = await appDb.select({ code: schema.stories.code, name: schema.stories.name, status: schema.stories.status, aliases: schema.stories.aliases }).from(schema.stories)
    } else if (collection === 'writing') {
      // `writing` has no `status`/`aliases` columns (it uses `canonState` instead) -- code/name
      // match only.
      const writingRows = await appDb.select({ code: schema.writing.code, name: schema.writing.name }).from(schema.writing)
      rows = writingRows.map(r => ({ ...r, status: null, aliases: [] }))
    } else {
      const table = getWorldTable(collection)
      if (!table) continue
      rows = await appDb.select({ code: table.code, name: table.name, status: table.status, aliases: table.aliases }).from(table as never) as typeof rows
    }
    for (const r of rows) {
      const aliases = (r.aliases ?? []) as { alias: string }[]
      const matches = r.code === upper
        || r.name.toLowerCase().includes(q)
        || aliases.some(a => a.alias.toLowerCase().includes(q))
      if (matches) results.push({ code: r.code, collection, name: r.name, status: r.status ?? 'in_development' })
    }
  }

  results.sort((a, b) => {
    if (a.code === upper && b.code !== upper) return -1
    if (b.code === upper && a.code !== upper) return 1
    return a.name.localeCompare(b.name)
  })
  return results
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

// Step UX1: "[n] entries, [n] need attention" on the home launcher's type cards. Matches the
// Gaps page's own definition of a gap -- any entry not yet Locked (hard rule 4).
export async function getCollectionNeedsAttentionCount(collection: string): Promise<number> {
  const list = await getCollectionList(collection)
  return list.docs.filter(d => (d as Record<string, unknown>).status !== 'locked').length
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

// ─── Boards (step W5) ──────────────────────────────────────────────────────
// A board never creates edges in the link index — it only draws them. See
// traveler-wiki-build-plan.md "boards".

export type BoardKind = 'node_map' | 'content_tree' | 'family_tree' | 'causal_tree' | 'story_map' | 'whiteboard' | 'story_canvas'
export type BoardQuery = {
  collections: string[]; relationshipTypes: string[]; sources: string[]
  direction: 'out' | 'in' | 'both'; depth: number
  yearFrom: number | null; yearTo: number | null
}
export type BoardNodePositions = Record<string, { x: number; y: number; collapsed?: boolean; pinned?: boolean }>

export async function getBoardsList() {
  await getAllTags()
  const docs = await appDb.select().from(schema.boards).orderBy(schema.boards.name)
  return {
    docs: docs.map(d => ({ ...d, tags: resolveTagIds((d.tagIds ?? []) as number[]) })),
    totalDocs: docs.length,
  }
}

export async function getBoardByCode(code: string) {
  await getAllTags()
  const rows = await appDb.select().from(schema.boards).where(eq(schema.boards.code, code.toUpperCase())).limit(1)
  const board = rows[0]
  if (!board) return null
  return {
    ...board,
    tags: resolveTagIds((board.tagIds ?? []) as number[]),
    kind: board.kind as BoardKind,
    rootCodes: (board.rootCodes ?? []) as string[],
    query: board.query as BoardQuery,
    nodePositions: (board.nodePositions ?? {}) as BoardNodePositions,
  }
}

// ─── Story Builder canvas board (step SB2) ──────────────────────────────────
// One singleton board, kind = 'story_canvas', holds the canvas's viewport (x, y, zoom). Hard rule
// 15/18: layout position belongs to a board, never the record being drawn. Box positions, sizes and
// groups land on this same board's nodePositions once SB3 creates boxes -- this query only returns
// the row; app/(app)/story-builder/page.tsx creates it lazily via createEntityAction if missing.
export async function getStoryCanvasBoard() {
  const rows = await appDb.select().from(schema.boards).where(eq(schema.boards.kind, 'story_canvas')).limit(1)
  const board = rows[0]
  if (!board) return null
  return { ...board, viewport: board.viewport as { x: number; y: number; zoom: number } | null }
}

// Step SB3: every beat box on the canvas, dated or not, regardless of story -- a beat starts
// storyless and only joins one once merged with another beat (step SB5). Horizontal position
// always comes from startYear, never stored (hard rule 18).
export type CanvasBeat = { id: number; code: string; name: string; startYear: number | null; storyId: number | null }

export async function getCanvasBeats(): Promise<CanvasBeat[]> {
  // A promoted beat (step SB4's "Make this a...") is represented on the canvas by the entity it
  // became, not by its own idea box any more -- the beat row itself stays (the Beats lane still
  // shows it), it just drops out of the canvas's beat list once it is no longer an active idea.
  return appDb
    .select({ id: schema.beats.id, code: schema.beats.code, name: schema.beats.name, startYear: schema.beats.startYear, storyId: schema.beats.storyId })
    .from(schema.beats)
    .where(ne(schema.beats.state, 'promoted'))
    .orderBy(schema.beats.createdAt)
}

// Step SB4: entries that can sit on the Story Builder canvas (the right-hand shelf). `year` is the
// one number that places the box horizontally when it has one: startYear for events and stories,
// createdYear for items. Characters carry `birthYear` separately because their box shows an age,
// not a placement. Locations and lore have no year field yet, so they are always undated.
export type ShelfCollection = 'characters' | 'locations' | 'events' | 'stories' | 'items' | 'lore'
export type ShelfEntry = {
  id: number
  code: string
  name: string
  collection: ShelfCollection
  year: number | null
  birthYear: number | null
}

export async function getShelfEntries(): Promise<ShelfEntry[]> {
  const [chars, locs, evs, sts, its, lr] = await Promise.all([
    appDb.select({ id: schema.characters.id, code: schema.characters.code, name: schema.characters.name, birthYear: schema.characters.birthYear }).from(schema.characters).orderBy(schema.characters.name),
    appDb.select({ id: schema.locations.id, code: schema.locations.code, name: schema.locations.name }).from(schema.locations).orderBy(schema.locations.name),
    appDb.select({ id: schema.events.id, code: schema.events.code, name: schema.events.name, startYear: schema.events.startYear }).from(schema.events).orderBy(schema.events.name),
    appDb.select({ id: schema.stories.id, code: schema.stories.code, name: schema.stories.name, startYear: schema.stories.startYear }).from(schema.stories).orderBy(schema.stories.name),
    appDb.select({ id: schema.items.id, code: schema.items.code, name: schema.items.name, createdYear: schema.items.createdYear }).from(schema.items).orderBy(schema.items.name),
    appDb.select({ id: schema.lore.id, code: schema.lore.code, name: schema.lore.name }).from(schema.lore).orderBy(schema.lore.name),
  ])
  return [
    ...chars.map(r => ({ ...r, collection: 'characters' as const, year: null, birthYear: r.birthYear })),
    ...locs.map(r => ({ ...r, collection: 'locations' as const, year: null, birthYear: null })),
    ...evs.map(r => ({ id: r.id, code: r.code, name: r.name, collection: 'events' as const, year: r.startYear, birthYear: null })),
    ...sts.map(r => ({ id: r.id, code: r.code, name: r.name, collection: 'stories' as const, year: r.startYear, birthYear: null })),
    ...its.map(r => ({ id: r.id, code: r.code, name: r.name, collection: 'items' as const, year: r.createdYear, birthYear: null })),
    ...lr.map(r => ({ ...r, collection: 'lore' as const, year: null, birthYear: null })),
  ]
}

// ─── Tables (step W6) ──────────────────────────────────────────────────────

export type TableColumnType = 'text' | 'number' | 'date' | 'link' | 'tag'
export type TableColumn = { key: string; label: string; type: TableColumnType; width: number | null }
export type TableRow = Record<string, string>

export async function getTablesList() {
  await getAllTags()
  const docs = await appDb.select().from(schema.tables).orderBy(schema.tables.name)
  return {
    docs: docs.map(d => ({ ...d, tags: resolveTagIds((d.tagIds ?? []) as number[]) })),
    totalDocs: docs.length,
  }
}

export async function getTableByCode(code: string) {
  await getAllTags()
  const rows = await appDb.select().from(schema.tables).where(eq(schema.tables.code, code.toUpperCase())).limit(1)
  const table = rows[0]
  if (!table) return null
  return {
    ...table,
    tags: resolveTagIds((table.tagIds ?? []) as number[]),
    columns: (table.columns ?? []) as TableColumn[],
    rows: (table.rows ?? []) as TableRow[],
  }
}

// ─── Compilations (Phase 7) ────────────────────────────────────────────────────
// An ordered set of events and entries. `items` on the row is just an array of codes (order =
// compile order, same spirit as tables.rows); this resolves each one to a display-ready row and
// silently drops a code whose record was since deleted rather than erroring the whole page.
export type CompilationKind = 'age' | 'chapter' | 'custom'
export type CompilationItem = { code: string; collection: string; name: string; status: string }

export async function getCompilationsList() {
  await getAllTags()
  const docs = await appDb.select().from(schema.compilations).orderBy(schema.compilations.name)
  return {
    docs: docs.map(d => ({ ...d, tags: resolveTagIds((d.tagIds ?? []) as number[]) })),
    totalDocs: docs.length,
  }
}

export async function resolveCompilationItems(codes: string[]): Promise<CompilationItem[]> {
  const resolved = await Promise.all(codes.map(async (code) => {
    const collection = PREFIX_TO_SLUG[code[0]?.toUpperCase() ?? '']
    if (!collection) return null
    const doc = await getEntryByCode(collection, code) as Record<string, unknown> | null
    if (!doc) return null
    return { code: code.toUpperCase(), collection, name: String(doc.name ?? code), status: String(doc.status ?? 'in_development') }
  }))
  return resolved.filter((r): r is CompilationItem => r !== null)
}

export async function getCompilationByCode(code: string) {
  await getAllTags()
  const rows = await appDb.select().from(schema.compilations).where(eq(schema.compilations.code, code.toUpperCase())).limit(1)
  const compilation = rows[0]
  if (!compilation) return null
  const codes = (compilation.items ?? []) as string[]
  return {
    ...compilation,
    tags: resolveTagIds((compilation.tagIds ?? []) as number[]),
    kind: compilation.kind as CompilationKind,
    items: await resolveCompilationItems(codes),
  }
}
