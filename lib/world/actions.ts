'use server'

import { revalidatePath } from 'next/cache'
import { eq, or, and } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { assignNextCode, slugify } from '@/db/codes'
import { PREFIX_TO_SLUG } from '@/lib/codes'
import { syncLinksForRecord, removeRecordLinks, isLinkRelevantField } from '@/lib/graph/sync'

// ─── Table map ───────────────────────────────────────────────────────────────
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
  chronicles: schema.chronicles as unknown as AnyTable,
}

function getTable(collection: string) {
  if (collection === 'events') return schema.events as unknown as AnyTable
  if (collection === 'stories') return schema.stories as unknown as AnyTable
  if (collection === 'writing') return schema.writing as unknown as AnyTable
  return WORLD_TABLE_MAP[collection] ?? null
}

// ─── updateEventYearAction ────────────────────────────────────────────────────
export async function updateEventYearAction(id: string, year: number) {
  await appDb.update(schema.events)
    .set({ startYear: Math.round(year), updatedAt: new Date() })
    .where(eq(schema.events.id, Number(id)))
  revalidatePath('/timeline')
}

// ─── updateEventLaneAction ────────────────────────────────────────────────────
export async function updateEventLaneAction(id: string, lane: number) {
  await appDb.update(schema.events)
    .set({ lane: Math.max(0, Math.min(10, Math.round(lane))), updatedAt: new Date() })
    .where(eq(schema.events.id, Number(id)))
  revalidatePath('/timeline')
}

// ─── updateTimelineSettingsAction ─────────────────────────────────────────────
// timeline_settings is a singleton global (id fixed at 1), not a coded collection, so it gets
// its own small upsert rather than going through getTable()/createEntityAction.
export async function updateTimelineSettingsAction(
  data: Partial<{
    scaleMode: 'to_scale' | 'in_sequence'
    gaps: { fromYear: number; toYear: number; collapsedTo: number; label: string }[]
    defaultZoomStart: number | null
    defaultZoomEnd: number | null
  }>
): Promise<{ ok: boolean; error?: string }> {
  try {
    await appDb.insert(schema.timelineSettings)
      .values({ id: 1, ...data, updatedAt: new Date() })
      .onConflictDoUpdate({ target: schema.timelineSettings.id, set: { ...data, updatedAt: new Date() } })
    revalidatePath('/timeline')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── Era actions ──────────────────────────────────────────────────────────────
// Thin wrappers so the Timeline page's era panel doesn't need to know createEntityAction's
// generic collection-string signature. Eras use the same generic CRUD as the world collections
// (getTable('eras') is wired above) — no bespoke table logic needed.
export async function createEraAction(data: {
  name: string
  startYear: number | null
  endYear: number | null
  yearLabel: string | null
  color: string | null
  kind: string
  parentId: number | null
}): Promise<{ id: number; code?: string; error?: string }> {
  return createEntityAction('eras', data)
}

export async function updateEraAction(
  id: number,
  data: Partial<{
    name: string
    startYear: number | null
    endYear: number | null
    yearLabel: string | null
    color: string | null
    kind: string
    parentId: number | null
  }>
): Promise<{ ok: boolean; error?: string }> {
  for (const [field, value] of Object.entries(data)) {
    const res = await updateFieldAction('eras', id, field, value)
    if (!res.ok) return res
  }
  return { ok: true }
}

export async function deleteEraAction(id: number): Promise<{ ok: boolean; error?: string }> {
  return deleteEntityAction('eras', id)
}

// ─── Map pin actions ───────────────────────────────────────────────────────────
// createEntityAction's generic insert drops any non-primitive field (so it never has to resolve
// relationships at create time) — geometry is JSON, so it is always set in a follow-up call here.
export async function createMapPinAction(data: {
  mapId: number
  name: string
  shape: 'pin' | 'label' | 'line' | 'circle' | 'polygon'
  geometry: unknown
  icon?: string | null
  color?: string | null
  group?: string | null
  layer?: string | null
}): Promise<{ id: number; code?: string; error?: string }> {
  const created = await createEntityAction('map-pins', {
    mapId: data.mapId, name: data.name, shape: data.shape,
    icon: data.icon ?? null, color: data.color ?? null, group: data.group ?? null, layer: data.layer ?? null,
  })
  if (created.error || !created.id) return created
  const geomRes = await updateFieldAction('map-pins', created.id, 'geometry', data.geometry)
  if (!geomRes.ok) return { id: created.id, code: created.code, error: geomRes.error }
  revalidatePath('/maps')
  return created
}

export async function updateMapPinGeometryAction(id: number, geometry: unknown): Promise<{ ok: boolean; error?: string }> {
  const res = await updateFieldAction('map-pins', id, 'geometry', geometry)
  revalidatePath('/maps')
  return res
}

export async function resolveEntryForLinkAction(
  code: string
): Promise<{ collection: string; entryId: number; name: string } | null> {
  const { resolveCodeLookup } = await import('@/lib/world/queries')
  const result = await resolveCodeLookup(code)
  if (!result) return null
  const { getEntryByCode } = await import('@/lib/world/queries')
  const entry = await getEntryByCode(result.collection, result.code) as { id: number } | null
  if (!entry) return null
  return { collection: result.collection, entryId: entry.id, name: result.name }
}

// Like resolveEntryForLinkAction, but also returns the resolved code itself — for fields that
// store a plain code string (a chronicle's filter.involvesCodes), not a foreign-key id.
export async function resolveCodeForDisplayAction(query: string): Promise<{ code: string; collection: string; name: string } | null> {
  const { resolveCodeLookup } = await import('@/lib/world/queries')
  return resolveCodeLookup(query)
}

export async function updateMapPinLinksAction(
  mapPinId: number,
  links: { entryCollection: string; entryId: number }[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    await appDb.delete(schema.mapPinLinks).where(eq(schema.mapPinLinks.mapPinId, mapPinId))
    if (links.length > 0) {
      await appDb.insert(schema.mapPinLinks).values(
        links.map(l => ({ mapPinId, entryCollection: l.entryCollection, entryId: l.entryId }))
      )
    }
    await appDb.update(schema.mapPins).set({ updatedAt: new Date() }).where(eq(schema.mapPins.id, mapPinId))
    await syncLinksForRecord('map-pins', mapPinId)
    revalidatePath('/maps')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── searchForEntry ───────────────────────────────────────────────────────────
export async function searchForEntry(query: string): Promise<{ code: string; collection: string } | null> {
  const { resolveCodeLookup } = await import('@/lib/world/queries')
  const result = await resolveCodeLookup(query)
  if (!result) return null
  return { code: result.code, collection: result.collection }
}

// ─── createEntityAction ───────────────────────────────────────────────────────
export async function createEntityAction(
  collection: string,
  data: Record<string, unknown>
): Promise<{ id: number; code?: string; slug?: string; error?: string }> {
  try {
    const prefix = getPrefixForCollection(collection)
    if (!prefix) return { id: 0, error: `Unknown collection: ${collection}` }

    const code = await assignNextCode(prefix)
    const name = String(data.name ?? 'Untitled')
    const baseSlug = slugify(name)
    const slug = baseSlug ? `${baseSlug}-${code.toLowerCase()}` : code.toLowerCase()

    const table = getTable(collection)
    if (!table) return { id: 0, error: `No table for collection: ${collection}` }

    const insertData: Record<string, unknown> = { ...data, code, slug, name }
    // Remove relationship fields that need ID resolution; they are set after create.
    // Any value that is not a primitive is dropped here (components handle them via updateFieldAction).
    for (const [k, v] of Object.entries(insertData)) {
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        delete insertData[k]
      }
    }

    const [row] = await (appDb.insert(table as never) as ReturnType<typeof appDb.insert>)
      .values(insertData as never)
      .returning({ id: (table as typeof schema.characters).id })

    const newId = (row as { id: number }).id
    await syncLinksForRecord(collection, newId)

    revalidatePath(`/${collection}`)
    revalidatePath('/')
    return { id: newId, code, slug }
  } catch (err) {
    return { id: 0, error: String(err) }
  }
}

// ─── updateFieldAction ────────────────────────────────────────────────────────
export async function updateFieldAction(
  collection: string,
  id: number,
  field: string,
  value: unknown
): Promise<{ ok: boolean; error?: string }> {
  try {
    const table = getTable(collection)
    if (!table) return { ok: false, error: `No table for: ${collection}` }

    await (appDb.update(table as never) as ReturnType<typeof appDb.update>)
      .set({ [field]: value, updatedAt: new Date() } as never)
      .where(eq((table as typeof schema.characters).id, id))

    if (isLinkRelevantField(collection, field)) {
      await syncLinksForRecord(collection, id)
    }

    revalidatePath(`/${collection}`)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── updateDetailsAction ──────────────────────────────────────────────────────
export async function updateDetailsAction(
  collection: string,
  id: number,
  details: { label: string; value: string; inInfobox: boolean; id?: string }[]
): Promise<{ ok: boolean; error?: string }> {
  return updateFieldAction(collection, id, 'details', details)
}

// ─── checkDeleteConflictsAction ───────────────────────────────────────────────
export async function checkDeleteConflictsAction(
  collection: string,
  id: number,
  code: string
): Promise<{ conflicts: { collection: string; code: string; name: string }[] }> {
  const conflicts: { collection: string; code: string; name: string }[] = []

  // Relationships with fromCode or toCode matching
  const rels = await appDb.select({
    id: schema.relationships.id,
    code: schema.relationships.code,
    fromCode: schema.relationships.fromCode,
    toCode: schema.relationships.toCode,
    title: schema.relationships.title,
  }).from(schema.relationships).where(
    or(
      eq(schema.relationships.fromCode, code),
      eq(schema.relationships.toCode, code)
    )
  )
  for (const r of rels) {
    conflicts.push({
      collection: 'relationships',
      code: r.code,
      name: r.title ?? `Relationship ${r.fromCode} -> ${r.toCode}`,
    })
  }

  // Children in same collection
  const table = getTable(collection)
  if (table && collection !== 'events' && collection !== 'stories' && collection !== 'writing') {
    const children = await appDb.select({
      id: (table as typeof schema.characters).id,
      code: (table as typeof schema.characters).code,
      name: (table as typeof schema.characters).name,
    }).from(table as never).where(eq((table as typeof schema.characters).parentId, id))
    for (const c of children as { id: number; code: string; name: string }[]) {
      conflicts.push({ collection, code: c.code, name: c.name })
    }
  }
  if (collection === 'events') {
    const children = await appDb.select({ id: schema.events.id, code: schema.events.code, name: schema.events.name })
      .from(schema.events).where(eq(schema.events.parentId, id))
    for (const c of children) conflicts.push({ collection: 'events', code: c.code, name: c.name })
  }

  // Events that involve this entry
  if (collection !== 'events' && collection !== 'stories' && collection !== 'writing' && collection !== 'relationships') {
    const involveRows = await appDb.select({ eventId: schema.eventInvolves.eventId })
      .from(schema.eventInvolves)
      .where(and(eq(schema.eventInvolves.entryId, id), eq(schema.eventInvolves.entryCollection, collection)))
    if (involveRows.length > 0) {
      const eventIds = involveRows.map(r => r.eventId)
      const evts = await appDb.select({ id: schema.events.id, code: schema.events.code, name: schema.events.name })
        .from(schema.events)
        .where(eq(schema.events.id, eventIds[0]))
      for (const e of evts) conflicts.push({ collection: 'events', code: e.code, name: e.name })
    }
  }

  // Stories that dramatize this event
  if (collection === 'events') {
    const dramatizeRows = await appDb.select({ storyId: schema.storyDramatizes.storyId })
      .from(schema.storyDramatizes)
      .where(eq(schema.storyDramatizes.eventId, id))
    if (dramatizeRows.length > 0) {
      const storyIds = dramatizeRows.map(r => r.storyId)
      const storyRows = await appDb.select({ id: schema.stories.id, code: schema.stories.code, name: schema.stories.name })
        .from(schema.stories)
        .where(eq(schema.stories.id, storyIds[0]))
      for (const s of storyRows) conflicts.push({ collection: 'stories', code: s.code, name: s.name })
    }
  }

  return { conflicts }
}

// ─── deleteEntityAction ───────────────────────────────────────────────────────
export async function deleteEntityAction(
  collection: string,
  id: number
): Promise<{ ok: boolean; error?: string }> {
  try {
    const table = getTable(collection)
    if (!table) return { ok: false, error: `No table for: ${collection}` }
    const rows = await appDb.select({ code: (table as typeof schema.characters).code })
      .from(table as never).where(eq((table as typeof schema.characters).id, id)).limit(1)
    const code = (rows[0] as { code: string } | undefined)?.code

    // No DB-level cascade is defined for map_pins/map_pin_links/event_pins/event_involves, so
    // clean up children by hand.
    if (collection === 'map-pins') {
      await appDb.delete(schema.mapPinLinks).where(eq(schema.mapPinLinks.mapPinId, id))
      await appDb.delete(schema.eventPins).where(eq(schema.eventPins.mapPinId, id))
    } else if (collection === 'events') {
      await appDb.delete(schema.eventInvolves).where(eq(schema.eventInvolves.eventId, id))
      await appDb.delete(schema.eventPins).where(eq(schema.eventPins.eventId, id))
    } else if (collection === 'maps') {
      const pins = await appDb.select({ id: schema.mapPins.id, code: schema.mapPins.code })
        .from(schema.mapPins).where(eq(schema.mapPins.mapId, id))
      for (const pin of pins) {
        await appDb.delete(schema.mapPinLinks).where(eq(schema.mapPinLinks.mapPinId, pin.id))
      }
      if (pins.length) {
        await appDb.delete(schema.mapPins).where(eq(schema.mapPins.mapId, id))
        for (const pin of pins) await removeRecordLinks(pin.code)
      }
    }

    await (appDb.delete(table as never) as ReturnType<typeof appDb.delete>)
      .where(eq((table as typeof schema.characters).id, id))
    if (code) await removeRecordLinks(code)

    revalidatePath(`/${collection}`)
    revalidatePath('/')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── createRelationshipAction ─────────────────────────────────────────────────
export async function createRelationshipAction(
  fromCode: string,
  toCode: string,
  type: string,
  notes?: string
): Promise<{ ok: boolean; id?: number; error?: string }> {
  try {
    const fromCollection = PREFIX_TO_SLUG[fromCode[0]]
    const toCollection = PREFIX_TO_SLUG[toCode[0]]
    if (!fromCollection || !toCollection) return { ok: false, error: 'Unknown code prefix' }

    const fromTable = getTable(fromCollection)
    const toTable = getTable(toCollection)
    if (!fromTable || !toTable) return { ok: false, error: 'Unknown collection table' }

    const [fromRows, toRows] = await Promise.all([
      appDb.select({ id: (fromTable as typeof schema.characters).id })
        .from(fromTable as never)
        .where(eq((fromTable as typeof schema.characters).code, fromCode))
        .limit(1),
      appDb.select({ id: (toTable as typeof schema.characters).id })
        .from(toTable as never)
        .where(eq((toTable as typeof schema.characters).code, toCode))
        .limit(1),
    ])
    const fromId = (fromRows[0] as { id: number } | undefined)?.id
    const toId = (toRows[0] as { id: number } | undefined)?.id
    if (!fromId || !toId) return { ok: false, error: 'One or both records not found' }

    const { RELATIONSHIP_TYPES } = await import('@/lib/relationshipTypes')
    const relType = RELATIONSHIP_TYPES.find(t => t.value === type)
    const typeLabel = relType?.label ?? type
    const code = await assignNextCode('X')
    const title = `${fromCode} ${typeLabel} ${toCode}`

    const [rel] = await appDb.insert(schema.relationships).values({
      code,
      fromCollection,
      fromId,
      fromCode,
      toCollection,
      toId,
      toCode,
      type,
      notes: notes ?? null,
      title,
    }).returning({ id: schema.relationships.id })

    const relId = (rel as { id: number }).id
    await syncLinksForRecord('relationships', relId)

    return { ok: true, id: relId }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── deleteRelationshipAction ─────────────────────────────────────────────────
export async function deleteRelationshipAction(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const rows = await appDb.select({ code: schema.relationships.code })
      .from(schema.relationships).where(eq(schema.relationships.id, id)).limit(1)
    const code = rows[0]?.code

    await appDb.delete(schema.relationships).where(eq(schema.relationships.id, id))
    if (code) await removeRecordLinks(code)

    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── updateTagsAction ─────────────────────────────────────────────────────────
export async function updateTagsAction(
  collection: string,
  id: number,
  tagIds: number[],
  reviewNote?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const table = getTable(collection)
    if (!table) return { ok: false, error: `No table for: ${collection}` }
    const updateData: Record<string, unknown> = { tagIds, updatedAt: new Date() }
    if (reviewNote !== undefined) updateData.reviewNote = reviewNote
    await (appDb.update(table as never) as ReturnType<typeof appDb.update>)
      .set(updateData as never)
      .where(eq((table as typeof schema.characters).id, id))
    revalidatePath(`/${collection}`)
    revalidatePath('/review')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── attachImageAction ────────────────────────────────────────────────────────
export async function attachImageAction(
  collection: string,
  id: number,
  mediaId: number | null
): Promise<{ ok: boolean; error?: string }> {
  return updateFieldAction(collection, id, 'imageId', mediaId)
}

// ─── updateEventInvolvesAction ────────────────────────────────────────────────
export async function updateEventInvolvesAction(
  eventId: number,
  involves: { relationTo: string; value: number }[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    // Delete all existing involves for this event
    await appDb.delete(schema.eventInvolves).where(eq(schema.eventInvolves.eventId, eventId))
    // Insert new ones
    if (involves.length > 0) {
      await appDb.insert(schema.eventInvolves).values(
        involves.map(i => ({
          eventId,
          entryCollection: i.relationTo,
          entryId: i.value,
        }))
      )
    }
    await appDb.update(schema.events).set({ updatedAt: new Date() }).where(eq(schema.events.id, eventId))
    await syncLinksForRecord('events', eventId)
    revalidatePath('/events')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── updateEventPinsAction ─────────────────────────────────────────────────────
// Step W4: the map pins showing where an event happened. A chronicle uses these to move the map
// when an event is selected.
export async function updateEventPinsAction(
  eventId: number,
  mapPinIds: number[]
): Promise<{ ok: boolean; error?: string }> {
  try {
    await appDb.delete(schema.eventPins).where(eq(schema.eventPins.eventId, eventId))
    if (mapPinIds.length > 0) {
      await appDb.insert(schema.eventPins).values(mapPinIds.map(mapPinId => ({ eventId, mapPinId })))
    }
    await appDb.update(schema.events).set({ updatedAt: new Date() }).where(eq(schema.events.id, eventId))
    await syncLinksForRecord('events', eventId)
    revalidatePath('/events')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── Helper: get code prefix for a collection ─────────────────────────────────
function getPrefixForCollection(collection: string): string | null {
  const { ENTITY_PREFIXES } = require('@/lib/codes') as typeof import('@/lib/codes')
  return (ENTITY_PREFIXES as Record<string, string>)[collection] ?? null
}
