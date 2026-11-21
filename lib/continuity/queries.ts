import 'server-only'
import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { DECISION_KINDS, UPDATE_KINDS } from './constants'
import { entityHref } from './links'
import { conflictPriority, type ConflictPriority } from './priority'

// Same per-file table map convention as lib/world/queries.ts, lib/world/actions.ts and
// lib/graph/sync.ts: the 8 world-entry tables share column shapes but not a common type,
// so each file that needs to query across all of them keeps its own small map.
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
}

export async function countOpenDecisions(): Promise<number> {
  const [row] = await appDb
    .select({ n: sql<number>`count(*)::int` })
    .from(schema.continuity)
    .where(and(eq(schema.continuity.status, 'open'), inArray(schema.continuity.kind, DECISION_KINDS)))
  return row?.n ?? 0
}

export interface FlagRow {
  id: number
  code: string
  kind: string
  status: string
  choice: string | null
  reason: string | null
  context: string | null
  fieldLabel: string
  existingExcerpt: string | null
  newQuote: string
  explanation: string | null
  createdAt: Date
  resolvedAt: Date | null
  writingId: number
  writingCode: string
  writingName: string
  entryCollection: string
  entryId: number
  entryName: string
  entrySlug: string
  priority: ConflictPriority
}

// Looks up the world-entry name/slug for a flag's (entryCollection, entryId) across the
// 8 world tables, since Drizzle can't join against a table chosen dynamically per row. Also
// reads the entry's current status, so a conflict's priority (step S7's Draft-vs-Locked split)
// always reflects what canon says now, not a snapshot from when the flag was raised.
async function enrichEntries<T extends { entryCollection: string; entryId: number }>(rows: T[]): Promise<(T & { entryName: string; entrySlug: string; priority: ConflictPriority })[]> {
  const byCollection = new Map<string, number[]>()
  for (const r of rows) byCollection.set(r.entryCollection, [...(byCollection.get(r.entryCollection) ?? []), r.entryId])

  const found = new Map<string, { name: string; slug: string; status: string }>()
  for (const [collection, ids] of byCollection) {
    const table = WORLD_TABLE_MAP[collection]
    if (!table) continue
    const rowsFound = await appDb.select({ id: table.id, name: table.name, slug: table.slug, status: table.status })
      .from(table as never).where(inArray(table.id, ids))
    for (const f of rowsFound as { id: number; name: string; slug: string; status: string }[]) {
      found.set(`${collection}:${f.id}`, { name: f.name, slug: f.slug, status: f.status })
    }
  }

  return rows.map((r) => {
    const match = found.get(`${r.entryCollection}:${r.entryId}`)
    return {
      ...r,
      entryName: match?.name ?? '(deleted entry)',
      entrySlug: match?.slug ?? '',
      priority: conflictPriority(match?.status ?? 'in_development'),
    }
  })
}

const flagColumns = {
  id: schema.continuity.id,
  code: schema.continuity.code,
  kind: schema.continuity.kind,
  status: schema.continuity.status,
  choice: schema.continuity.choice,
  reason: schema.continuity.reason,
  context: schema.continuity.context,
  fieldLabel: schema.continuity.fieldLabel,
  existingExcerpt: schema.continuity.existingExcerpt,
  newQuote: schema.continuity.newQuote,
  explanation: schema.continuity.explanation,
  createdAt: schema.continuity.createdAt,
  resolvedAt: schema.continuity.resolvedAt,
  writingId: schema.continuity.writingId,
  writingCode: schema.writing.code,
  writingName: schema.writing.name,
  entryCollection: schema.continuity.entryCollection,
  entryId: schema.continuity.entryId,
}

function baseFlagQuery() {
  return appDb.select(flagColumns).from(schema.continuity)
    .innerJoin(schema.writing, eq(schema.writing.id, schema.continuity.writingId))
}

export async function listOpenDecisions(): Promise<FlagRow[]> {
  const rows = await baseFlagQuery()
    .where(and(eq(schema.continuity.status, 'open'), inArray(schema.continuity.kind, DECISION_KINDS)))
    .orderBy(schema.continuity.createdAt)
  const enriched = await enrichEntries(rows)
  // Step S7's Draft-vs-Locked split: a conflict against a Locked entry comes first. A stable
  // sort keeps each priority group in the createdAt order the query already gave it.
  return enriched
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (a.r.priority === b.r.priority ? a.i - b.i : a.r.priority === 'high' ? -1 : 1))
    .map(({ r }) => r)
}

export async function listOpenUpdates(): Promise<FlagRow[]> {
  const rows = await baseFlagQuery()
    .where(and(eq(schema.continuity.status, 'open'), inArray(schema.continuity.kind, UPDATE_KINDS)))
    .orderBy(desc(schema.continuity.createdAt))
  return enrichEntries(rows)
}

export async function listDecisionLog(limit = 200): Promise<FlagRow[]> {
  const rows = await baseFlagQuery()
    .where(and(eq(schema.continuity.status, 'resolved'), inArray(schema.continuity.kind, DECISION_KINDS)))
    .orderBy(desc(schema.continuity.resolvedAt))
    .limit(limit)
  return enrichEntries(rows)
}

export async function getFlag(code: string): Promise<FlagRow | null> {
  const rows = await baseFlagQuery().where(eq(schema.continuity.code, code.toUpperCase())).limit(1)
  const enriched = await enrichEntries(rows)
  return enriched[0] ?? null
}

export async function listOpenFlagsForEntity(collection: string, entryId: number): Promise<FlagRow[]> {
  const rows = await baseFlagQuery()
    .where(and(eq(schema.continuity.entryCollection, collection), eq(schema.continuity.entryId, entryId), eq(schema.continuity.status, 'open')))
    .orderBy(schema.continuity.createdAt)
  return enrichEntries(rows)
}

export interface HistoryRow {
  id: number
  fieldLabel: string
  action: string
  oldValue: string | null
  newValue: string | null
  createdAt: Date
  writingId: number | null
  writingName: string | null
}

export async function listEntityHistory(collection: string, entryId: number): Promise<HistoryRow[]> {
  return appDb
    .select({
      id: schema.continuityHistory.id,
      fieldLabel: schema.continuityHistory.fieldLabel,
      action: schema.continuityHistory.action,
      oldValue: schema.continuityHistory.oldValue,
      newValue: schema.continuityHistory.newValue,
      createdAt: schema.continuityHistory.createdAt,
      writingId: schema.continuityHistory.writingId,
      writingName: schema.writing.name,
    })
    .from(schema.continuityHistory)
    .leftJoin(schema.writing, eq(schema.writing.id, schema.continuityHistory.writingId))
    .where(and(eq(schema.continuityHistory.entryCollection, collection), eq(schema.continuityHistory.entryId, entryId)))
    .orderBy(desc(schema.continuityHistory.createdAt))
}

export interface CheckSummary {
  decisions: number
  newRecords: number
  newDetails: number
  confirmed: number
  claims: number
}

// Counts for one piece of writing's most recent check, shown next to the editor. claims is the
// honest-limit count (step S7): how many checkable facts the check actually found, so a thin
// result reads as "checked, little found" rather than silence.
export async function getCheckSummary(writingId: number): Promise<CheckSummary> {
  const rows = await appDb.select({ kind: schema.continuity.kind, status: schema.continuity.status })
    .from(schema.continuity).where(eq(schema.continuity.writingId, writingId))
  const decisions = rows.filter((r) => r.status === 'open' && (r.kind === 'conflict' || r.kind === 'possible_change')).length
  const newRecords = rows.filter((r) => r.kind === 'new_record').length
  const newDetails = rows.filter((r) => r.kind === 'new_detail').length
  const [confirmedRow] = await appDb.select({ n: sql<number>`count(*)::int` })
    .from(schema.continuityConfirmations).where(eq(schema.continuityConfirmations.writingId, writingId))
  const [claimsRow] = await appDb.select({ n: sql<number>`count(*)::int` })
    .from(schema.claims).where(eq(schema.claims.writingId, writingId))
  return { decisions, newRecords, newDetails, confirmed: confirmedRow?.n ?? 0, claims: claimsRow?.n ?? 0 }
}

export interface WritingHistoryRow {
  id: number
  entryCollection: string
  entryId: number
  entryName: string
  entrySlug: string
  fieldLabel: string
  action: string
  oldValue: string | null
  newValue: string | null
  createdAt: Date
}

// "Leaving Canon" (step S7): every change this piece of writing caused, across every record it
// touched, so Bobby can see and revert them whether or not this piece is still Canon.
export async function listHistoryForWriting(writingId: number): Promise<WritingHistoryRow[]> {
  const rows = await appDb.select({
    id: schema.continuityHistory.id,
    entryCollection: schema.continuityHistory.entryCollection,
    entryId: schema.continuityHistory.entryId,
    fieldLabel: schema.continuityHistory.fieldLabel,
    action: schema.continuityHistory.action,
    oldValue: schema.continuityHistory.oldValue,
    newValue: schema.continuityHistory.newValue,
    createdAt: schema.continuityHistory.createdAt,
  }).from(schema.continuityHistory)
    .where(eq(schema.continuityHistory.writingId, writingId))
    .orderBy(desc(schema.continuityHistory.createdAt))
  return enrichEntries(rows)
}

export { entityHref }
