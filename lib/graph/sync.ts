// The link-sync engine. Recomputes every link row owned by one record and upserts them by key.
// Called from the data layer's write functions (lib/world/actions.ts, lib/studio/actions.ts) and
// from scripts/rebuild-links.ts. Never call this from a view — views only read the index.
// See traveler-wiki-build-plan.md "Link index".

import { eq, or } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { extractCodes, PREFIX_TO_SLUG } from '@/lib/codes'
import { RELATIONSHIP_TYPES } from '@/lib/relationshipTypes'
import { TEXT_FIELDS } from '@/lib/graph/extract'

type AnyTable = typeof schema.characters

const WORLD_TABLE_MAP: Record<string, AnyTable> = {
  characters: schema.characters as unknown as AnyTable,
  locations: schema.locations as unknown as AnyTable,
  items: schema.items as unknown as AnyTable,
  cultures: schema.cultures as unknown as AnyTable,
  factions: schema.factions as unknown as AnyTable,
  races: schema.races as unknown as AnyTable,
  languages: schema.languages as unknown as AnyTable,
  lore: schema.lore as unknown as AnyTable,
  eras: schema.eras as unknown as AnyTable,
  maps: schema.maps as unknown as AnyTable,
  'map-pins': schema.mapPins as unknown as AnyTable,
}

function getTable(collection: string) {
  if (collection === 'events') return schema.events as unknown as AnyTable
  if (collection === 'stories') return schema.stories as unknown as AnyTable
  if (collection === 'writing') return schema.writing as unknown as AnyTable
  return WORLD_TABLE_MAP[collection] ?? null
}

export type PendingLink = {
  key: string
  fromCode: string
  fromCollection: string
  toCode: string
  toCollection: string
  source: 'relationship' | 'field' | 'parent' | 'text' | 'pin'
  type: string
  fieldName: string | null
  ownerCode: string
  directed: boolean
  startYear: number | null
  endYear: number | null
}

// Matches the "key is deterministic: source, owner code, type or field, from code, to code" rule.
// fieldName is deliberately excluded so e.g. the same code mentioned in two different text fields
// of the same record collapses to one edge, not two.
function linkKey(source: string, ownerCode: string, type: string, fromCode: string, toCode: string): string {
  return `${source}:${ownerCode}:${type}:${fromCode}:${toCode}`
}

async function codeForId(collection: string, id: number | null | undefined): Promise<string | null> {
  if (!id) return null
  const table = getTable(collection)
  if (!table) return null
  const rows = await appDb.select({ code: table.code }).from(table as never).where(eq(table.id, id)).limit(1)
  return (rows[0] as { code: string } | undefined)?.code ?? null
}

// Resolves a code to the record it names, across every coded collection that currently has a
// backing table. A code for a reserved-but-unbuilt prefix (A/B/Y/M/P/H/D/N) never resolves, so a
// link to it is simply not created — matching "a code with no record renders as plain text".
async function resolveCode(code: string): Promise<{ code: string; collection: string } | null> {
  const collection = PREFIX_TO_SLUG[code[0]]
  if (!collection) return null
  const table = getTable(collection)
  if (!table) return null
  const rows = await appDb.select({ code: table.code }).from(table as never).where(eq(table.code, code)).limit(1)
  if (!rows[0]) return null
  return { code: (rows[0] as { code: string }).code, collection }
}

// ─── field: direct foreign-key columns ───────────────────────────────────────

const SIMPLE_FIELD_LINKS: Record<string, { idField: string; toCollection: string; type: string }[]> = {
  characters: [
    { idField: 'birthplaceId', toCollection: 'locations', type: 'birthplace' },
    { idField: 'raceId', toCollection: 'races', type: 'race' },
    { idField: 'cultureId', toCollection: 'cultures', type: 'culture' },
  ],
  locations: [{ idField: 'cultureId', toCollection: 'cultures', type: 'culture' }],
  items: [
    { idField: 'currentOwnerId', toCollection: 'characters', type: 'currentOwner' },
    { idField: 'currentLocationId', toCollection: 'locations', type: 'currentLocation' },
  ],
  factions: [{ idField: 'cultureId', toCollection: 'cultures', type: 'culture' }],
  events: [{ idField: 'locationId', toCollection: 'locations', type: 'location' }],
  writing: [{ idField: 'storyId', toCollection: 'stories', type: 'story' }],
  maps: [{ idField: 'locationId', toCollection: 'locations', type: 'location' }],
  'map-pins': [
    { idField: 'mapId', toCollection: 'maps', type: 'onMap' },
    { idField: 'opensMapId', toCollection: 'maps', type: 'opensMap' },
  ],
}

const ARRAY_FIELD_LINKS: Record<string, { idsField: string; toCollection: string; type: string }[]> = {
  cultures: [
    { idsField: 'homelandIds', toCollection: 'locations', type: 'homeland' },
    { idsField: 'cultureLanguageIds', toCollection: 'languages', type: 'language' },
  ],
}

async function extractSimpleFieldLinks(
  collection: string, ownerCode: string, record: Record<string, unknown>
): Promise<PendingLink[]> {
  const specs = SIMPLE_FIELD_LINKS[collection]
  if (!specs) return []
  const links: PendingLink[] = []
  for (const spec of specs) {
    const toCode = await codeForId(spec.toCollection, record[spec.idField] as number | null | undefined)
    if (!toCode) continue
    links.push({
      key: linkKey('field', ownerCode, spec.type, ownerCode, toCode),
      fromCode: ownerCode, fromCollection: collection,
      toCode, toCollection: spec.toCollection,
      source: 'field', type: spec.type, fieldName: spec.type,
      ownerCode, directed: true, startYear: null, endYear: null,
    })
  }
  return links
}

async function extractArrayFieldLinks(
  collection: string, ownerCode: string, record: Record<string, unknown>
): Promise<PendingLink[]> {
  const specs = ARRAY_FIELD_LINKS[collection]
  if (!specs) return []
  const links: PendingLink[] = []
  for (const spec of specs) {
    const ids = (record[spec.idsField] ?? []) as number[]
    for (const id of ids) {
      const toCode = await codeForId(spec.toCollection, id)
      if (!toCode) continue
      links.push({
        key: linkKey('field', ownerCode, spec.type, ownerCode, toCode),
        fromCode: ownerCode, fromCollection: collection,
        toCode, toCollection: spec.toCollection,
        source: 'field', type: spec.type, fieldName: spec.type,
        ownerCode, directed: true, startYear: null, endYear: null,
      })
    }
  }
  return links
}

// ─── field: join tables (involves, dramatizes) ───────────────────────────────

async function extractJoinTableLinks(
  ownerCode: string, ownerCollection: string, type: string,
  rows: { entryCollection: string; entryId: number }[]
): Promise<PendingLink[]> {
  const links: PendingLink[] = []
  for (const r of rows) {
    const toCode = await codeForId(r.entryCollection, r.entryId)
    if (!toCode) continue
    links.push({
      key: linkKey('field', ownerCode, type, ownerCode, toCode),
      fromCode: ownerCode, fromCollection: ownerCollection,
      toCode, toCollection: r.entryCollection,
      source: 'field', type, fieldName: type,
      ownerCode, directed: true, startYear: null, endYear: null,
    })
  }
  return links
}

async function extractEventInvolvesLinks(ownerCode: string, eventId: number): Promise<PendingLink[]> {
  const rows = await appDb.select({
    entryCollection: schema.eventInvolves.entryCollection, entryId: schema.eventInvolves.entryId,
  }).from(schema.eventInvolves).where(eq(schema.eventInvolves.eventId, eventId))
  return extractJoinTableLinks(ownerCode, 'events', 'involves', rows)
}

async function extractStoryInvolvesLinks(ownerCode: string, storyId: number): Promise<PendingLink[]> {
  const rows = await appDb.select({
    entryCollection: schema.storyInvolves.entryCollection, entryId: schema.storyInvolves.entryId,
  }).from(schema.storyInvolves).where(eq(schema.storyInvolves.storyId, storyId))
  return extractJoinTableLinks(ownerCode, 'stories', 'involves', rows)
}

async function extractStoryDramatizesLinks(ownerCode: string, storyId: number): Promise<PendingLink[]> {
  const rows = await appDb.select({ eventId: schema.storyDramatizes.eventId })
    .from(schema.storyDramatizes).where(eq(schema.storyDramatizes.storyId, storyId))
  return extractJoinTableLinks(
    ownerCode, 'stories', 'dramatizes',
    rows.map(r => ({ entryCollection: 'events', entryId: r.eventId }))
  )
}

async function extractMapPinLinksLinks(ownerCode: string, mapPinId: number): Promise<PendingLink[]> {
  const rows = await appDb.select({
    entryCollection: schema.mapPinLinks.entryCollection, entryId: schema.mapPinLinks.entryId,
  }).from(schema.mapPinLinks).where(eq(schema.mapPinLinks.mapPinId, mapPinId))
  return extractJoinTableLinks(ownerCode, 'map-pins', 'links', rows)
}

// ─── parent: the `parentId` ("Part of") field ────────────────────────────────
// Always within the owner's own collection (characters' parent is a character, an event's parent
// is an event, and so on) — matches lib/world/queries.ts's resolveParent().

async function extractParentLink(
  collection: string, ownerCode: string, record: Record<string, unknown>
): Promise<PendingLink[]> {
  const parentId = record.parentId as number | null | undefined
  if (!parentId) return []
  const parentCode = await codeForId(collection, parentId)
  if (!parentCode) return []
  return [{
    key: linkKey('parent', ownerCode, 'parent', ownerCode, parentCode),
    fromCode: ownerCode, fromCollection: collection,
    toCode: parentCode, toCollection: collection,
    source: 'parent', type: 'parent', fieldName: null,
    ownerCode, directed: true, startYear: null, endYear: null,
  }]
}

// ─── text: ID codes typed in rich text, textareas, detail values, writing ───

async function extractTextLinks(
  collection: string, ownerCode: string, record: Record<string, unknown>
): Promise<PendingLink[]> {
  const specs = TEXT_FIELDS[collection]
  if (!specs) return []

  const fieldNameOf = new Map<string, string>()
  for (const spec of specs) {
    if (spec.kind === 'plain') {
      const text = record[spec.field] as string | null | undefined
      if (!text) continue
      for (const code of extractCodes(text)) {
        if (!fieldNameOf.has(code)) fieldNameOf.set(code, spec.field)
      }
    } else {
      const details = (record.details ?? []) as { label: string; value: string }[]
      for (const d of details) {
        if (!d.value) continue
        for (const code of extractCodes(d.value)) {
          if (!fieldNameOf.has(code)) fieldNameOf.set(code, `details.${d.label}`)
        }
      }
    }
  }

  fieldNameOf.delete(ownerCode) // a record mentioning its own code is not a connection

  const links: PendingLink[] = []
  for (const [code, fieldName] of fieldNameOf) {
    const target = await resolveCode(code)
    if (!target) continue // a code with no record is not indexed
    links.push({
      key: linkKey('text', ownerCode, 'mentions', ownerCode, target.code),
      fromCode: ownerCode, fromCollection: collection,
      toCode: target.code, toCollection: target.collection,
      source: 'text', type: 'mentions', fieldName,
      ownerCode, directed: true, startYear: null, endYear: null,
    })
  }
  return links
}

// ─── relationship: an X record ───────────────────────────────────────────────

function extractRelationshipLink(rel: {
  code: string; fromCode: string; fromCollection: string
  toCode: string; toCollection: string; type: string
  startYear: number | null; endYear: number | null
}): PendingLink {
  const relType = RELATIONSHIP_TYPES.find(t => t.value === rel.type)
  const directed = relType ? relType.label !== relType.inverse : true
  return {
    key: linkKey('relationship', rel.code, rel.type, rel.fromCode, rel.toCode),
    fromCode: rel.fromCode, fromCollection: rel.fromCollection,
    toCode: rel.toCode, toCollection: rel.toCollection,
    source: 'relationship', type: rel.type, fieldName: null,
    ownerCode: rel.code, directed,
    startYear: rel.startYear ?? null, endYear: rel.endYear ?? null,
  }
}

// ─── upkeep ───────────────────────────────────────────────────────────────────

async function writeOwnedLinks(ownerCode: string, pending: PendingLink[]): Promise<void> {
  const deduped = new Map<string, PendingLink>()
  for (const p of pending) deduped.set(p.key, p)
  const toInsert = [...deduped.values()]

  const del = appDb.delete(schema.links).where(eq(schema.links.ownerCode, ownerCode))
  if (toInsert.length === 0) {
    await del
    return
  }
  const ins = appDb.insert(schema.links).values(toInsert)
  await appDb.batch([del, ins] as [typeof del, typeof ins])
}

// Whether editing this field on this collection could change the record's links, so the generic
// updateFieldAction (lib/world/actions.ts) knows when a resync is worth doing. Kept here, next to
// the field maps it mirrors, so the two can never drift apart.
export function isLinkRelevantField(collection: string, field: string): boolean {
  if (field === 'parentId' || field === 'details') return true
  if (SIMPLE_FIELD_LINKS[collection]?.some(s => s.idField === field)) return true
  if (ARRAY_FIELD_LINKS[collection]?.some(s => s.idsField === field)) return true
  if (TEXT_FIELDS[collection]?.some(s => s.kind === 'plain' && s.field === field)) return true
  return false
}

// Computes the rows one coded record should own, without writing anything. Exported so
// scripts/rebuild-links.ts can do a read-only dry run with the exact same extraction logic the
// real sync uses — never a second, hand-maintained copy of it.
export async function computeOwnedLinks(collection: string, id: number): Promise<PendingLink[]> {
  if (collection === 'relationships') {
    const rows = await appDb.select().from(schema.relationships).where(eq(schema.relationships.id, id)).limit(1)
    const rel = rows[0]
    if (!rel) return []
    return [extractRelationshipLink(rel)]
  }

  const table = getTable(collection)
  if (!table) return []
  const rows = await appDb.select().from(table as never).where(eq(table.id, id)).limit(1)
  const record = rows[0] as Record<string, unknown> | undefined
  if (!record) return []
  const ownerCode = record.code as string

  const pending: PendingLink[] = [
    ...await extractParentLink(collection, ownerCode, record),
    ...await extractSimpleFieldLinks(collection, ownerCode, record),
    ...await extractArrayFieldLinks(collection, ownerCode, record),
    ...await extractTextLinks(collection, ownerCode, record),
  ]
  if (collection === 'events') pending.push(...await extractEventInvolvesLinks(ownerCode, record.id as number))
  if (collection === 'stories') {
    pending.push(...await extractStoryInvolvesLinks(ownerCode, record.id as number))
    pending.push(...await extractStoryDramatizesLinks(ownerCode, record.id as number))
  }
  if (collection === 'map-pins') pending.push(...await extractMapPinLinksLinks(ownerCode, record.id as number))
  return pending
}

async function getOwnerCode(collection: string, id: number): Promise<string | null> {
  if (collection === 'relationships') {
    const rows = await appDb.select({ code: schema.relationships.code })
      .from(schema.relationships).where(eq(schema.relationships.id, id)).limit(1)
    return rows[0]?.code ?? null
  }
  return codeForId(collection, id)
}

// Recomputes the rows owned by one coded record (world entry, event, story, writing, or
// relationship) and upserts them by key. Call after any write that could change what the record
// links to — a field edit, a create, an `involves`/`dramatizes` update.
export async function syncLinksForRecord(collection: string, id: number): Promise<void> {
  const [pending, ownerCode] = await Promise.all([
    computeOwnedLinks(collection, id),
    getOwnerCode(collection, id),
  ])
  if (!ownerCode) return
  await writeOwnedLinks(ownerCode, pending)
}

// Removes the rows a deleted record owned, and marks rows elsewhere that pointed at it broken
// (the code is never reused, so a broken row stays identifiable). Call from every delete action.
export async function removeRecordLinks(code: string): Promise<void> {
  await appDb.delete(schema.links).where(eq(schema.links.ownerCode, code))
  await appDb.update(schema.links)
    .set({ broken: true, updatedAt: new Date() })
    .where(or(eq(schema.links.fromCode, code), eq(schema.links.toCode, code)))
}
