// Tag helpers: built-in UNK tag, tag creation, UNK queue.

import { eq, inArray } from 'drizzle-orm'
import { appDb } from './index'
import * as schema from './schema'
import { assignNextCode } from './codes'
import {
  characters, locations, items, cultures, factions, races, languages,
  lore, events, stories, writing, relationships,
} from './schema'

export const UNK_TAG_NAME = 'UNK'
export const AI_SUGGESTED_TAG_NAME = 'AI suggested'

// Ensure both built-in tags exist. Returns the id of UNK.
export async function ensureBuiltinTags(): Promise<{ unkId: number; aiId: number }> {
  async function ensureTag(name: string, description: string): Promise<number> {
    const existing = await appDb.select({ id: schema.tags.id })
      .from(schema.tags)
      .where(eq(schema.tags.name, name))
      .limit(1)
    if (existing[0]) return existing[0].id

    const code = await assignNextCode('T')
    const [created] = await appDb.insert(schema.tags)
      .values({ code, name, description, builtIn: true })
      .returning({ id: schema.tags.id })
    return created.id
  }

  const unkId = await ensureTag(
    UNK_TAG_NAME,
    'Unverified. Filled in by Claude or an import on a best guess. Remove once you confirm.',
  )
  const aiId = await ensureTag(
    AI_SUGGESTED_TAG_NAME,
    'Suggested by AI. Review and remove once you confirm.',
  )
  return { unkId, aiId }
}

// ─── UNK queue ───────────────────────────────────────────────────────────────
// Returns every record tagged UNK across all tables.

type UnkRecord = {
  collection: string
  id: number
  code: string
  name: string
  reviewNote: string | null
}

const WORLD_TABLES = [
  { collection: 'characters', table: characters },
  { collection: 'locations', table: locations },
  { collection: 'items', table: items },
  { collection: 'cultures', table: cultures },
  { collection: 'factions', table: factions },
  { collection: 'races', table: races },
  { collection: 'languages', table: languages },
  { collection: 'lore', table: lore },
] as const

export async function getUnkQueue(): Promise<UnkRecord[]> {
  // First get the UNK tag id
  const unkRows = await appDb.select({ id: schema.tags.id })
    .from(schema.tags)
    .where(eq(schema.tags.name, UNK_TAG_NAME))
    .limit(1)
  if (!unkRows[0]) return []
  const unkId = unkRows[0].id

  const results: UnkRecord[] = []

  for (const { collection, table } of WORLD_TABLES) {
    // tagIds is a JSONB array. We need to find rows that contain unkId.
    // Drizzle does not have a built-in JSONB contains operator, so use sql tagged template.
    const { sql: sqlTag } = await import('drizzle-orm')
    const rows = await appDb.select({
      id: table.id,
      code: table.code,
      name: table.name,
      reviewNote: table.reviewNote,
      tagIds: table.tagIds,
    }).from(table)
    for (const row of rows) {
      const ids = (row.tagIds ?? []) as number[]
      if (ids.includes(unkId)) {
        results.push({ collection, id: row.id, code: row.code, name: row.name, reviewNote: row.reviewNote ?? null })
      }
    }
  }

  // Events and stories
  for (const { collection, table } of [
    { collection: 'events', table: events },
    { collection: 'stories', table: stories },
  ] as const) {
    const rows = await appDb.select({
      id: table.id,
      code: table.code,
      name: table.name,
      reviewNote: table.reviewNote,
      tagIds: table.tagIds,
    }).from(table as typeof events)
    for (const row of rows) {
      const ids = (row.tagIds ?? []) as number[]
      if (ids.includes(unkId)) {
        results.push({ collection, id: row.id, code: row.code, name: row.name ?? '', reviewNote: row.reviewNote ?? null })
      }
    }
  }

  // Relationships (no name column; the title is the label)
  const relRows = await appDb.select({
    id: relationships.id,
    code: relationships.code,
    title: relationships.title,
    reviewNote: relationships.reviewNote,
    tagIds: relationships.tagIds,
  }).from(relationships)
  for (const row of relRows) {
    const ids = (row.tagIds ?? []) as number[]
    if (ids.includes(unkId)) {
      results.push({ collection: 'relationships', id: row.id, code: row.code, name: row.title ?? row.code, reviewNote: row.reviewNote ?? null })
    }
  }

  // Writing
  const writingRows = await appDb.select({
    id: writing.id,
    code: writing.code,
    name: writing.name,
    reviewNote: writing.reviewNote,
    tagIds: writing.tagIds,
  }).from(writing)
  for (const row of writingRows) {
    const ids = (row.tagIds ?? []) as number[]
    if (ids.includes(unkId)) {
      results.push({ collection: 'writing', id: row.id, code: row.code, name: row.name, reviewNote: row.reviewNote ?? null })
    }
  }

  return results
}
