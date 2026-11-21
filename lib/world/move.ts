'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, getTableColumns, or, sql } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { assignNextCode, slugify } from '@/db/codes'
import { ENTITY_PREFIXES } from '@/lib/codes'
import { syncLinksForCode, syncLinksForRecord, removeRecordLinks } from '@/lib/graph/sync'
import { getUnkTagId } from '@/lib/world/queries'

type AnyTable = typeof schema.characters
type DetailRow = { label: string; value: string; inInfobox: boolean; id?: string }

const TABLES: Record<string, AnyTable> = {
  characters: schema.characters,
  locations: schema.locations,
  items: schema.items,
  cultures: schema.cultures,
  factions: schema.factions,
  races: schema.races,
  languages: schema.languages,
  lore: schema.lore,
  events: schema.events,
  stories: schema.stories,
} as unknown as Record<string, AnyTable>

const NEVER_COPIED = new Set(['id', 'code', 'slug', 'parentId', 'details', 'createdAt', 'updatedAt'])

function humanize(key: string): string {
  const spaced = key.replace(/([A-Z])/g, ' $1').toLowerCase().trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

// Things that still point at the entry by its table and id in a single column. A move would leave
// these pointing at nothing, so the move is refused until they are cleared.
async function blockers(collection: string, id: number): Promise<string[]> {
  const found: string[] = []
  const count = async (label: string, query: Promise<{ n: number }[]>) => {
    const n = Number((await query)[0]?.n ?? 0)
    if (n > 0) found.push(`${n} ${label}`)
  }

  const table = TABLES[collection] as AnyTable & { parentId?: unknown }
  if ('parentId' in getTableColumns(table)) {
    await count('entries nested under it', appDb.select({ n: sql<number>`count(*)` }).from(table as never).where(eq(table.parentId, id)) as never)
  }

  const c = schema
  switch (collection) {
    case 'characters':
      await count('items it owns', appDb.select({ n: sql<number>`count(*)` }).from(c.items).where(eq(c.items.currentOwnerId, id)))
      break
    case 'locations':
      await count('characters born there', appDb.select({ n: sql<number>`count(*)` }).from(c.characters).where(eq(c.characters.birthplaceId, id)))
      await count('items kept there', appDb.select({ n: sql<number>`count(*)` }).from(c.items).where(eq(c.items.currentLocationId, id)))
      await count('events set there', appDb.select({ n: sql<number>`count(*)` }).from(c.events).where(eq(c.events.locationId, id)))
      await count('maps tied to it', appDb.select({ n: sql<number>`count(*)` }).from(c.maps).where(eq(c.maps.locationId, id)))
      await count('cultures with it as a homeland', appDb.select({ n: sql<number>`count(*)` }).from(c.cultures).where(sql`${c.cultures.homelandIds} @> ${JSON.stringify([id])}::jsonb`))
      break
    case 'cultures':
      await count('characters in this culture', appDb.select({ n: sql<number>`count(*)` }).from(c.characters).where(eq(c.characters.cultureId, id)))
      await count('locations in this culture', appDb.select({ n: sql<number>`count(*)` }).from(c.locations).where(eq(c.locations.cultureId, id)))
      await count('factions in this culture', appDb.select({ n: sql<number>`count(*)` }).from(c.factions).where(eq(c.factions.cultureId, id)))
      break
    case 'races':
      await count('characters of this race', appDb.select({ n: sql<number>`count(*)` }).from(c.characters).where(eq(c.characters.raceId, id)))
      break
    case 'languages':
      await count('cultures that speak it', appDb.select({ n: sql<number>`count(*)` }).from(c.cultures).where(sql`${c.cultures.cultureLanguageIds} @> ${JSON.stringify([id])}::jsonb`))
      break
    case 'events':
      await count('stories that dramatize it', appDb.select({ n: sql<number>`count(*)` }).from(c.storyDramatizes).where(eq(c.storyDramatizes.eventId, id)))
      await count('map pins marking where it happened', appDb.select({ n: sql<number>`count(*)` }).from(c.eventPins).where(eq(c.eventPins.eventId, id)))
      break
    case 'stories':
      await count('events it dramatizes', appDb.select({ n: sql<number>`count(*)` }).from(c.storyDramatizes).where(eq(c.storyDramatizes.storyId, id)))
      await count('chapters and scenes written for it', appDb.select({ n: sql<number>`count(*)` }).from(c.writing).where(eq(c.writing.storyId, id)))
      break
  }
  return found
}

const swapCodes = (list: string[] | null | undefined, from: string, to: string) =>
  (list ?? []).map((c) => (c === from ? to : c))

// Boards, compilations and chronicles hold plain lists of codes. Repoint them so they name the new
// code rather than relying on the old one resolving.
async function repointCodeLists(oldCode: string, newCode: string): Promise<void> {
  for (const b of await appDb.select({ id: schema.boards.id, rootCodes: schema.boards.rootCodes, nodePositions: schema.boards.nodePositions }).from(schema.boards)) {
    const positions = (b.nodePositions ?? {}) as Record<string, unknown>
    const hasRoot = (b.rootCodes ?? []).includes(oldCode)
    const hasPos = oldCode in positions
    if (!hasRoot && !hasPos) continue
    const nextPositions = { ...positions }
    if (hasPos) { nextPositions[newCode] = nextPositions[oldCode]; delete nextPositions[oldCode] }
    await appDb.update(schema.boards).set({ rootCodes: swapCodes(b.rootCodes, oldCode, newCode), nodePositions: nextPositions as never, updatedAt: new Date() }).where(eq(schema.boards.id, b.id))
  }
  for (const comp of await appDb.select({ id: schema.compilations.id, items: schema.compilations.items }).from(schema.compilations)) {
    if (!(comp.items ?? []).includes(oldCode)) continue
    await appDb.update(schema.compilations).set({ items: swapCodes(comp.items, oldCode, newCode), updatedAt: new Date() }).where(eq(schema.compilations.id, comp.id))
  }
  for (const ch of await appDb.select({ id: schema.chronicles.id, filter: schema.chronicles.filter }).from(schema.chronicles)) {
    const filter = ch.filter
    if (!filter || !(filter.involvesCodes ?? []).includes(oldCode)) continue
    await appDb.update(schema.chronicles).set({ filter: { ...filter, involvesCodes: swapCodes(filter.involvesCodes, oldCode, newCode) }, updatedAt: new Date() }).where(eq(schema.chronicles.id, ch.id))
  }
}

// Moves one entry to another type. The entry gets a new code in the target type. The old code is
// kept in code_history and keeps resolving. Everything that points at the entry (involves lists,
// relationships, continuity records, map pin links) is repointed. Fields the target type does not
// have are kept as details rows so nothing is lost.
export async function moveEntryAction(
  fromCollection: string,
  fromId: number,
  toCollection: string,
): Promise<{ ok: boolean; newCode?: string; error?: string; note?: string }> {
  const from = TABLES[fromCollection]
  const to = TABLES[toCollection]
  if (!from || !to) return { ok: false, error: 'That type cannot be moved.' }
  if (fromCollection === toCollection) return { ok: false, error: 'It is already that type.' }

  const [source] = (await appDb.select().from(from as never).where(eq(from.id, fromId)).limit(1)) as unknown as Record<string, unknown>[]
  if (!source) return { ok: false, error: 'Entry not found.' }
  const oldCode = String(source.code)

  const blocked = await blockers(fromCollection, fromId)
  const swap = (fromCollection === 'events' && toCollection === 'stories') || (fromCollection === 'stories' && toCollection === 'events')
  if (fromCollection === 'events' && !swap) {
    const [{ n }] = await appDb.select({ n: sql<number>`count(*)` }).from(schema.eventInvolves).where(eq(schema.eventInvolves.eventId, fromId))
    if (Number(n) > 0) blocked.push(`${n} entries in its involves list`)
  }
  if (fromCollection === 'stories' && !swap) {
    const [{ n }] = await appDb.select({ n: sql<number>`count(*)` }).from(schema.storyInvolves).where(eq(schema.storyInvolves.storyId, fromId))
    if (Number(n) > 0) blocked.push(`${n} entries in its involves list`)
  }
  if (blocked.length > 0) {
    return { ok: false, error: `${oldCode} cannot move yet. Still attached: ${blocked.join(', ')}. Clear those first.` }
  }

  // Build the new row from the columns both types share, and keep the rest as details rows.
  const fromCols = Object.keys(getTableColumns(from))
  const toCols = new Set(Object.keys(getTableColumns(to)))
  const values: Record<string, unknown> = {}
  const extras: DetailRow[] = []
  const dropped: string[] = []
  for (const key of fromCols) {
    if (NEVER_COPIED.has(key)) continue
    const val = source[key]
    if (toCols.has(key)) { values[key] = val; continue }
    if (val === null || val === undefined || val === '') continue
    if (/Ids?$/.test(key)) { dropped.push(humanize(key).toLowerCase()); continue }
    extras.push({ label: humanize(key), value: String(val), inInfobox: false, id: `moved:${key}` })
  }
  if (source.parentId) dropped.push('nesting under a parent')

  const newCode = await assignNextCode(ENTITY_PREFIXES[toCollection as keyof typeof ENTITY_PREFIXES])
  const baseSlug = slugify(String(source.name))
  const existingDetails = Array.isArray(source.details) ? (source.details as DetailRow[]) : []
  const noteParts = [`Moved from ${oldCode} (${fromCollection}).`]
  if (extras.length > 0) noteParts.push(`${extras.length} field(s) the new type does not have were kept as details rows.`)
  if (dropped.length > 0) noteParts.push(`Not carried over: ${dropped.join(', ')}.`)
  const prevNote = source.reviewNote ? `${String(source.reviewNote)}\n` : ''

  const insertValues: Record<string, unknown> = {
    ...values,
    code: newCode,
    slug: baseSlug ? `${baseSlug}-${newCode.toLowerCase()}` : newCode.toLowerCase(),
    updatedAt: new Date(),
  }
  if (toCols.has('details')) insertValues.details = [...existingDetails, ...extras]
  if (toCols.has('reviewNote')) insertValues.reviewNote = `${prevNote}${noteParts.join(' ')}`
  // Hard rule 13: a guessed field mapping is tagged UNK so it gets a second look.
  if ((extras.length > 0 || dropped.length > 0) && toCols.has('tagIds')) {
    const unk = await getUnkTagId()
    if (unk) insertValues.tagIds = [...new Set([...((source.tagIds as number[] | null) ?? []), unk])]
  }

  let newId: number
  try {
    const [row] = await (appDb.insert(to as never) as ReturnType<typeof appDb.insert>)
      .values(insertValues as never)
      .returning({ id: to.id })
    newId = (row as { id: number }).id
  } catch (err) {
    return { ok: false, error: `Could not create the new entry: ${String(err)}` }
  }

  try {
    const ops: unknown[] = [
      appDb.update(schema.eventInvolves).set({ entryCollection: toCollection, entryId: newId })
        .where(and(eq(schema.eventInvolves.entryCollection, fromCollection), eq(schema.eventInvolves.entryId, fromId))),
      appDb.update(schema.storyInvolves).set({ entryCollection: toCollection, entryId: newId })
        .where(and(eq(schema.storyInvolves.entryCollection, fromCollection), eq(schema.storyInvolves.entryId, fromId))),
      appDb.update(schema.mapPinLinks).set({ entryCollection: toCollection, entryId: newId })
        .where(and(eq(schema.mapPinLinks.entryCollection, fromCollection), eq(schema.mapPinLinks.entryId, fromId))),
      appDb.update(schema.continuity).set({ entryCollection: toCollection, entryId: newId })
        .where(and(eq(schema.continuity.entryCollection, fromCollection), eq(schema.continuity.entryId, fromId))),
      appDb.update(schema.continuityHistory).set({ entryCollection: toCollection, entryId: newId })
        .where(and(eq(schema.continuityHistory.entryCollection, fromCollection), eq(schema.continuityHistory.entryId, fromId))),
      appDb.update(schema.continuityConfirmations).set({ entryCollection: toCollection, entryId: newId })
        .where(and(eq(schema.continuityConfirmations.entryCollection, fromCollection), eq(schema.continuityConfirmations.entryId, fromId))),
      appDb.update(schema.relationships).set({ fromCollection: toCollection, fromId: newId, fromCode: newCode })
        .where(and(eq(schema.relationships.fromCollection, fromCollection), eq(schema.relationships.fromId, fromId))),
      appDb.update(schema.relationships).set({ toCollection: toCollection, toId: newId, toCode: newCode })
        .where(and(eq(schema.relationships.toCollection, fromCollection), eq(schema.relationships.toId, fromId))),
      appDb.update(schema.codeHistory).set({ newCode }).where(eq(schema.codeHistory.newCode, oldCode)),
      appDb.insert(schema.codeHistory).values({ oldCode, newCode }),
    ]

    // An event and a story both keep a list of the entries they involve. Carry it across.
    if (swap) {
      if (fromCollection === 'events') {
        const rows = await appDb.select().from(schema.eventInvolves).where(eq(schema.eventInvolves.eventId, fromId))
        if (rows.length > 0) ops.push(appDb.insert(schema.storyInvolves).values(rows.map((r) => ({ storyId: newId, entryCollection: r.entryCollection, entryId: r.entryId }))).onConflictDoNothing())
        ops.push(appDb.delete(schema.eventInvolves).where(eq(schema.eventInvolves.eventId, fromId)))
      } else {
        const rows = await appDb.select().from(schema.storyInvolves).where(eq(schema.storyInvolves.storyId, fromId))
        if (rows.length > 0) ops.push(appDb.insert(schema.eventInvolves).values(rows.map((r) => ({ eventId: newId, entryCollection: r.entryCollection, entryId: r.entryId }))).onConflictDoNothing())
        ops.push(appDb.delete(schema.storyInvolves).where(eq(schema.storyInvolves.storyId, fromId)))
      }
    }

    ops.push(appDb.delete(from as never).where(eq(from.id, fromId)))
    await appDb.batch(ops as never)
  } catch (err) {
    // The batch is atomic, so nothing was repointed. Remove the copy so there is no duplicate.
    await appDb.delete(to as never).where(eq(to.id, newId)).catch(() => {})
    return { ok: false, error: `Move failed and nothing was changed: ${String(err)}` }
  }

  // The entry itself is moved. What is left is housekeeping on derived data, so a failure here is
  // reported, not fatal: scripts/rebuild-links.ts rebuilds the link index from the records.
  let housekeeping = ''
  try {
    // A relationship's title carries both end codes.
    const rels = await appDb.select({ id: schema.relationships.id, title: schema.relationships.title }).from(schema.relationships)
      .where(or(eq(schema.relationships.fromCode, newCode), eq(schema.relationships.toCode, newCode)))
    for (const r of rels) {
      if (r.title?.includes(oldCode)) {
        await appDb.update(schema.relationships).set({ title: r.title.split(oldCode).join(newCode) }).where(eq(schema.relationships.id, r.id))
      }
    }
    await repointCodeLists(oldCode, newCode)

    // Link index: everything that pointed at the old code is recomputed against the new one, then
    // the old code's own rows are removed.
    const owners = await appDb.selectDistinct({ ownerCode: schema.links.ownerCode }).from(schema.links)
      .where(or(eq(schema.links.fromCode, oldCode), eq(schema.links.toCode, oldCode)))
    await syncLinksForRecord(toCollection, newId)
    for (const { ownerCode } of owners) {
      if (ownerCode !== oldCode && ownerCode !== newCode) await syncLinksForCode(ownerCode)
    }
    await removeRecordLinks(oldCode)
  } catch (err) {
    housekeeping = ` The entry moved, but tidying the link index failed (${String(err)}). Run scripts/rebuild-links.ts to fix it.`
  }

  revalidatePath('/', 'layout')
  return { ok: true, newCode, note: noteParts.join(' ') + housekeeping }
}
