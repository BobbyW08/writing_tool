// The AI context builder (step S4). Given a record's code, gathers the record's own facts and
// everything linked to it from the link index, each labeled with its standing, and never includes
// Set aside writing. See traveler-wiki-build-plan.md "Writing Studio and AI layer".
//
// Deliberately does not import lib/world/queries.ts (it has `import 'server-only'`, which breaks
// a plain tsx script — same reason lib/graph/sync.ts keeps its own small table map instead of
// reusing lib/world/actions.ts's). This file stays script-safe so scripts/test-ai.ts can run it
// against the real database with no live model call.

import { eq, or, and } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { currentCodes } from '@/lib/codes-history'
import { PREFIX_TO_SLUG, WORLD_SLUGS } from '@/lib/codes'
import { toEdge, type LinkRow } from '@/lib/graph/types'

type AnyWorldTable = typeof schema.characters
const WORLD_TABLE_MAP: Record<string, AnyWorldTable> = {
  characters: schema.characters as unknown as AnyWorldTable,
  locations: schema.locations as unknown as AnyWorldTable,
  items: schema.items as unknown as AnyWorldTable,
  cultures: schema.cultures as unknown as AnyWorldTable,
  factions: schema.factions as unknown as AnyWorldTable,
  races: schema.races as unknown as AnyWorldTable,
  languages: schema.languages as unknown as AnyWorldTable,
  lore: schema.lore as unknown as AnyWorldTable,
  beats: schema.beats as unknown as AnyWorldTable,
}

export type Standing = 'locked' | 'in_development' | 'unk' | 'draft'

export const STANDING_LABEL: Record<Standing, string> = {
  locked: 'Locked canon',
  in_development: 'In development',
  unk: 'UNK, needs review',
  draft: 'From Draft writing, not yet canon',
}

export type ContextFact = { label: string; value: string; standing: Standing }
export type ContextConnection = { code: string; name: string; collection: string; relation: string; standing: Standing }
export type AiContext = {
  code: string
  name: string
  collection: string
  standing: Standing
  facts: ContextFact[]
  connections: ContextConnection[]
}

type DetailRow = { label: string; value: string }

let unkTagId: number | null | undefined

async function getUnkTagId(): Promise<number | null> {
  if (unkTagId !== undefined) return unkTagId
  const rows = await appDb.select({ id: schema.tags.id }).from(schema.tags).where(eq(schema.tags.name, 'UNK')).limit(1)
  unkTagId = rows[0]?.id ?? null
  return unkTagId
}

function standingForRecord(status: string, unk: boolean): Standing {
  if (unk) return 'unk'
  if (status === 'locked') return 'locked'
  return 'in_development'
}

async function isUnkTagged(tagIds: number[] | null | undefined): Promise<boolean> {
  const id = await getUnkTagId()
  return id !== null && (tagIds ?? []).includes(id)
}

function detailFacts(details: unknown, standing: Standing): ContextFact[] {
  const rows = (details ?? []) as DetailRow[]
  return rows.filter((d) => d.value).map((d) => ({ label: d.label, value: d.value, standing }))
}

// The record's own facts: summary, body/type-specific text fields, and every details row.
async function loadOwnFacts(
  code: string,
  collection: string
): Promise<{ name: string; status: string; tagIds: number[]; facts: ContextFact[] } | null> {
  if (collection === 'events') {
    const [row] = await appDb.select().from(schema.events).where(eq(schema.events.code, code)).limit(1)
    if (!row) return null
    const tagIds = (row.tagIds ?? []) as number[]
    const standing = standingForRecord(row.status, await isUnkTagged(tagIds))
    const facts: ContextFact[] = []
    if (row.summary) facts.push({ label: 'Summary', value: row.summary, standing })
    const textFields: [string | null, string][] = [
      [row.whatHappened, 'What happened'],
      [row.whyItHappened, 'Why it happened'],
      [row.whatItCaused, 'What it caused'],
      [row.whatWasLearned, 'What was learned'],
      [row.body, 'Body'],
    ]
    for (const [value, label] of textFields) if (value) facts.push({ label, value, standing })
    facts.push(...detailFacts(row.details, standing))
    return { name: row.name, status: row.status, tagIds, facts }
  }

  if (collection === 'stories') {
    const [row] = await appDb.select().from(schema.stories).where(eq(schema.stories.code, code)).limit(1)
    if (!row) return null
    const tagIds = (row.tagIds ?? []) as number[]
    const standing = standingForRecord(row.status, await isUnkTagged(tagIds))
    const facts: ContextFact[] = []
    if (row.summary) facts.push({ label: 'Summary', value: row.summary, standing })
    if (row.body) facts.push({ label: 'Body', value: row.body, standing })
    facts.push(...detailFacts(row.details, standing))
    return { name: row.name, status: row.status, tagIds, facts }
  }

  const table = WORLD_TABLE_MAP[collection]
  if (!table) return null
  const [row] = await appDb.select().from(table as never).where(eq(table.code, code)).limit(1)
  if (!row) return null
  const r = row as { name: string; status: string; tagIds: number[] | null; summary: string | null; body: string | null; details: unknown }
  const tagIds = r.tagIds ?? []
  const standing = standingForRecord(r.status, await isUnkTagged(tagIds))
  const facts: ContextFact[] = []
  if (r.summary) facts.push({ label: 'Summary', value: r.summary, standing })
  if (r.body) facts.push({ label: 'Body', value: r.body, standing })
  facts.push(...detailFacts(r.details, standing))
  return { name: r.name, status: r.status, tagIds, facts }
}

// The standing of the other side of a link. Set aside writing returns null (excluded entirely,
// per the plan's decision 2: "Set aside is excluded ... from AI context").
async function loadOtherStanding(code: string): Promise<{ name: string; collection: string; standing: Standing } | null> {
  const collection = PREFIX_TO_SLUG[code[0]]
  if (!collection) return null

  if (collection === 'writing') {
    const [row] = await appDb.select({ name: schema.writing.name, canonState: schema.writing.canonState })
      .from(schema.writing).where(eq(schema.writing.code, code)).limit(1)
    if (!row) return null
    if (row.canonState === 'set_aside') return null
    return { name: row.name, collection, standing: row.canonState === 'draft' ? 'draft' : 'locked' }
  }
  if (collection === 'events') {
    const [row] = await appDb.select({ name: schema.events.name, status: schema.events.status, tagIds: schema.events.tagIds })
      .from(schema.events).where(eq(schema.events.code, code)).limit(1)
    if (!row) return null
    return { name: row.name, collection, standing: standingForRecord(row.status, await isUnkTagged(row.tagIds as number[] | null)) }
  }
  if (collection === 'stories') {
    const [row] = await appDb.select({ name: schema.stories.name, status: schema.stories.status, tagIds: schema.stories.tagIds })
      .from(schema.stories).where(eq(schema.stories.code, code)).limit(1)
    if (!row) return null
    return { name: row.name, collection, standing: standingForRecord(row.status, await isUnkTagged(row.tagIds as number[] | null)) }
  }
  const table = WORLD_TABLE_MAP[collection]
  if (!table) return null
  const [row] = await appDb.select({ name: table.name, status: table.status, tagIds: table.tagIds })
    .from(table as never).where(eq(table.code, code)).limit(1)
  if (!row) return null
  const r = row as { name: string; status: string; tagIds: number[] | null }
  return { name: r.name, collection, standing: standingForRecord(r.status, await isUnkTagged(r.tagIds)) }
}

// The numeric row id behind a code, for the Accept and Reject inbox to write to. Returns null for
// a collection with no backing table yet (e.g. a beat before step S5 exists).
export async function resolveIdForCode(code: string, collection: string): Promise<number | null> {
  if (collection === 'events') {
    const [row] = await appDb.select({ id: schema.events.id }).from(schema.events).where(eq(schema.events.code, code)).limit(1)
    return row?.id ?? null
  }
  if (collection === 'stories') {
    const [row] = await appDb.select({ id: schema.stories.id }).from(schema.stories).where(eq(schema.stories.code, code)).limit(1)
    return row?.id ?? null
  }
  const table = WORLD_TABLE_MAP[collection]
  if (!table) return null
  const [row] = await appDb.select({ id: table.id }).from(table as never).where(eq(table.code, code)).limit(1)
  return (row as { id: number } | undefined)?.id ?? null
}

export async function buildAiContext(rawCode: string): Promise<AiContext | null> {
  const upper = rawCode.trim().toUpperCase()
  const code = (await currentCodes([upper])).get(upper) ?? upper
  const collection = PREFIX_TO_SLUG[code[0]]
  if (!collection) return null
  if (collection !== 'events' && collection !== 'stories' && collection !== 'beats' && !(WORLD_SLUGS as readonly string[]).includes(collection)) return null

  const own = await loadOwnFacts(code, collection)
  if (!own) return null

  const linkRows = await appDb.select().from(schema.links).where(
    and(eq(schema.links.broken, false), or(eq(schema.links.fromCode, code), eq(schema.links.toCode, code)))
  )

  const connections: ContextConnection[] = []
  for (const row of linkRows) {
    const outward = row.fromCode === code
    const otherCode = outward ? row.toCode : row.fromCode
    const other = await loadOtherStanding(otherCode)
    if (!other) continue // not found, or Set aside writing — never included
    const edge = toEdge(row as LinkRow)
    connections.push({
      code: otherCode,
      name: other.name,
      collection: other.collection,
      relation: outward ? edge.label : edge.inverseLabel,
      standing: other.standing,
    })
  }

  const standing = standingForRecord(own.status, await isUnkTagged(own.tagIds))
  return { code, name: own.name, collection, standing, facts: own.facts, connections }
}

// Renders a context into text for a prompt. Every fact and connection is referenced by code, per
// the plan's decision: "Context is referenced by code."
export function formatContextForPrompt(ctx: AiContext): string {
  const lines: string[] = []
  lines.push(`=== ${ctx.code} ${ctx.name} (${ctx.collection}) — ${STANDING_LABEL[ctx.standing]} ===`)
  if (ctx.facts.length === 0) lines.push('(no fields recorded yet)')
  for (const f of ctx.facts) lines.push(`[${f.label}] (${STANDING_LABEL[f.standing]}) ${f.value}`)
  if (ctx.connections.length > 0) {
    lines.push('')
    lines.push('Connections:')
    for (const c of ctx.connections) {
      lines.push(`- ${c.relation} ${c.code} ${c.name} (${c.collection}) — ${STANDING_LABEL[c.standing]}`)
    }
  }
  return lines.join('\n')
}
