import 'server-only'
import { and, eq, inArray, isNotNull, lt, ne, or, sql as drizzleSql } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { assignNextCode } from '@/db/codes'
import { WORLD_SLUGS } from '@/lib/codes'
import { createEntityAction, updateDetailsAction, updateTagsAction } from '@/lib/world/actions'
import { getCollectionList, getUnkTagId } from '@/lib/world/queries'
import { aiAnalyzer, type Analyzer } from './analyze'
import { EXPECTED_LABELS, type EntityDbType } from './constants'
import { buildPlan, filterDetect, type Plan } from './plan'
import type { EntityForCheck, SnippetForCheck } from './types'
import { appendToField, buildNewRecordGapPrompt, normalizeForCompare, resolveLabel } from './text'

const STALE_CHECK_MS = 10 * 60 * 1000

type DetailRow = { label: string; value: string; inInfobox: boolean; id?: string }

// What applyPlan needs to turn a plan entry (keyed by code, same id the pure logic uses)
// back into a real world record: which collection/table it lives in, its numeric id, and
// its current details array (so a new detail can be appended without a re-fetch).
type Ref = { collection: EntityDbType; dbId: number; details: DetailRow[]; tagIds: number[] }

// Marks a piece of writing as being checked. Returns false when a check is already running,
// so two saves in a row cannot run the same check twice. A check stuck for ten minutes is dead.
export async function claimCheck(writingId: number): Promise<boolean> {
  const staleBefore = new Date(Date.now() - STALE_CHECK_MS)
  const rows = await appDb.update(schema.writing)
    .set({ checkStatus: 'checking', checkStartedAt: new Date(), checkError: null })
    .where(and(
      eq(schema.writing.id, writingId),
      or(ne(schema.writing.checkStatus, 'checking'), lt(schema.writing.checkStartedAt, staleBefore)),
    ))
    .returning({ id: schema.writing.id })
  return rows.length > 0
}

async function loadWorldIndex(): Promise<{ entities: EntityForCheck[]; refs: Map<string, Ref> }> {
  const entities: EntityForCheck[] = []
  const refs = new Map<string, Ref>()
  for (const collection of WORLD_SLUGS) {
    const { docs } = await getCollectionList(collection)
    for (const doc of docs as Record<string, unknown>[]) {
      const code = doc.code as string
      const details = ((doc.details ?? []) as DetailRow[])
      const fields: Record<string, string> = {}
      for (const d of details) if (d.value && d.value.trim()) fields[d.label] = d.value
      entities.push({ id: code, slug: doc.slug as string, name: doc.name as string, type: collection, fields })
      refs.set(code, {
        collection,
        dbId: doc.id as number,
        details,
        tagIds: (doc.tagIds as number[] | null) ?? [],
      })
    }
  }
  return { entities, refs }
}

export async function runContinuityCheck(writingId: number, analyzer: Analyzer = aiAnalyzer): Promise<void> {
  try {
    const [writing] = await appDb.select().from(schema.writing).where(eq(schema.writing.id, writingId)).limit(1)
    if (!writing) return

    const { entities: allEntities, refs } = await loadWorldIndex()

    const snippetInput: SnippetForCheck = {
      title: writing.name,
      label: null,
      body: writing.plainText ?? '',
      sortOrder: writing.startYear,
    }

    const detect = await analyzer.detect({ snippet: snippetInput, index: allEntities })
    const { mentioned, candidates } = filterDetect(detect, allEntities, snippetInput.body)
    const compare = mentioned.length > 0 || candidates.length > 0
      ? await analyzer.compare({ snippet: snippetInput, mentioned, candidates })
      : { findings: [] }

    const priorAges = await loadPriorAges(mentioned.map((e) => e.id), refs, writingId)
    const plan = buildPlan({ snippet: snippetInput, mentioned, candidates, compare, priorAges })

    await applyPlan(writingId, writing.name, writing.canonState, plan, refs)

    const notes = plan.discarded > 0
      ? `${plan.discarded} finding${plan.discarded === 1 ? ' was' : 's were'} discarded because the exact wording could not be found in your text or in canon.`
      : null
    await appDb.update(schema.writing)
      .set({ checkStatus: 'checked', checkedAt: new Date(), checkNotes: notes, checkError: null })
      .where(eq(schema.writing.id, writingId))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await appDb.update(schema.writing)
      .set({ checkStatus: 'failed', checkError: message.slice(0, 1000) })
      .where(eq(schema.writing.id, writingId))
  }
}

// `${code}::${canon field label, lower case}` -> timeline position (startYear) of the most
// recent other piece of writing that set that field. Lets a later scene count as a possible
// change, not a conflict.
async function loadPriorAges(codes: string[], refs: Map<string, Ref>, currentWritingId: number): Promise<Map<string, number>> {
  const ages = new Map<string, number>()
  if (codes.length === 0) return ages
  const pairs = codes.map((c) => ({ code: c, ref: refs.get(c) })).filter((p): p is { code: string; ref: Ref } => !!p.ref)
  if (pairs.length === 0) return ages
  const ids = [...new Set(pairs.map((p) => p.ref.dbId))]

  const rows = await appDb
    .select({
      entryCollection: schema.continuityHistory.entryCollection,
      entryId: schema.continuityHistory.entryId,
      label: schema.continuityHistory.fieldLabel,
      age: drizzleSql<number>`max(${schema.writing.startYear})`,
    })
    .from(schema.continuityHistory)
    .innerJoin(schema.writing, eq(schema.writing.id, schema.continuityHistory.writingId))
    .where(and(
      inArray(schema.continuityHistory.entryId, ids),
      ne(schema.continuityHistory.writingId, currentWritingId),
      isNotNull(schema.writing.startYear),
    ))
    .groupBy(schema.continuityHistory.entryCollection, schema.continuityHistory.entryId, schema.continuityHistory.fieldLabel)

  const refKeyToCode = new Map<string, string>()
  for (const { code, ref } of pairs) refKeyToCode.set(`${ref.collection}:${ref.dbId}`, code)

  for (const row of rows) {
    const code = refKeyToCode.get(`${row.entryCollection}:${row.entryId}`)
    if (!code) continue
    ages.set(`${code}::${row.label.trim().toLowerCase()}`, Number(row.age))
  }
  return ages
}

// Claims ledger (step S7): one row per checkable fact, additive alongside the writes already
// made below. sourceCanonState is the writing's own canonState, recorded so a later question
// ("did this come from a still-Draft piece?") stays answerable after the fact (plan decision,
// closes part of O7, "Draft never spreads").
async function recordClaims(
  writingId: number,
  sourceCanonState: string,
  rows: { collection: string; dbId: number; fieldLabel: string; quote: string; kind: string }[],
): Promise<void> {
  if (rows.length === 0) return
  await appDb.insert(schema.claims).values(
    rows.map((r) => ({
      writingId,
      entryCollection: r.collection,
      entryId: r.dbId,
      fieldLabel: r.fieldLabel,
      quote: r.quote,
      impliedValue: r.quote,
      sourceCanonState,
      kind: r.kind,
    }))
  )
}

async function applyPlan(writingId: number, writingName: string, sourceCanonState: string, plan: Plan, refs: Map<string, Ref>): Promise<void> {
  // A fresh check replaces what the last check of this writing left undecided. Decisions
  // already made, and the notices for changes already applied, stay.
  await appDb.delete(schema.continuity).where(and(
    eq(schema.continuity.writingId, writingId),
    eq(schema.continuity.status, 'open'),
    inArray(schema.continuity.kind, ['conflict', 'possible_change']),
  ))
  await appDb.delete(schema.continuityConfirmations).where(eq(schema.continuityConfirmations.writingId, writingId))

  const unkId = await getUnkTagId()
  const unkTagIds = unkId ? [unkId] : []

  // 1. Records for things the writing names that were never logged. Only quoted wording goes in.
  for (const newEntity of plan.newEntities) {
    const labels = newEntity.details.map((d) => d.label)
    const detailsArr: DetailRow[] = newEntity.details.map((d) => ({ label: d.label, value: d.quote, inInfobox: false }))
    const gapPrompt = buildNewRecordGapPrompt(writingName, EXPECTED_LABELS[newEntity.type], labels)

    const created = await createEntityAction(newEntity.type, {
      status: 'in_development',
      gapPrompt,
      reviewNote: `Created automatically by the continuity check from "${writingName}". Verify the details.`,
      tagIds: unkTagIds,
      details: detailsArr,
    })
    if (created.error || !created.code) continue

    refs.set(created.code, { collection: newEntity.type, dbId: created.id, details: detailsArr, tagIds: unkTagIds })

    const flagCode = await assignNextCode('Q')
    await appDb.batch([
      ...newEntity.details.map((d) => appDb.insert(schema.continuityHistory).values({
        entryCollection: newEntity.type,
        entryId: created.id,
        fieldLabel: d.label,
        action: 'created',
        oldValue: null,
        newValue: d.quote,
        writingId,
      })),
      appDb.insert(schema.continuity).values({
        code: flagCode,
        writingId,
        entryCollection: newEntity.type,
        entryId: created.id,
        kind: 'new_record',
        fieldLabel: labels.join(', '),
        newQuote: newEntity.details[0].quote,
        status: 'open',
      }),
    ] as unknown as Parameters<typeof appDb.batch>[0])

    await recordClaims(writingId, sourceCanonState, newEntity.details.map((d) => ({
      collection: newEntity.type, dbId: created.id, fieldLabel: d.label, quote: d.quote, kind: 'new_record',
    })))
  }

  // 2. New details on entries that already exist.
  const byCode = new Map<string, Plan['newDetails']>()
  for (const d of plan.newDetails) byCode.set(d.entityId, [...(byCode.get(d.entityId) ?? []), d])
  for (const [code, details] of byCode) {
    const ref = refs.get(code)
    if (!ref) continue
    const existingLabels = ref.details.map((d) => d.label)
    const nextDetails = [...ref.details]

    for (const d of details) {
      const resolved = resolveLabel(existingLabels, d.label)
      const idx = nextDetails.findIndex((row) => row.label.trim().toLowerCase() === resolved.trim().toLowerCase())
      const before = idx >= 0 ? nextDetails[idx].value : undefined
      const value = appendToField(before, d.quote)
      if (idx >= 0) nextDetails[idx] = { ...nextDetails[idx], value }
      else {
        nextDetails.push({ label: resolved, value, inInfobox: false })
        existingLabels.push(resolved)
      }

      const flagCode = await assignNextCode('Q')
      await appDb.batch([
        appDb.insert(schema.continuityHistory).values({
          entryCollection: ref.collection, entryId: ref.dbId, fieldLabel: resolved, action: 'added',
          oldValue: before ?? null, newValue: value, writingId,
        }),
        appDb.insert(schema.continuity).values({
          code: flagCode, writingId, entryCollection: ref.collection, entryId: ref.dbId,
          kind: 'new_detail', fieldLabel: resolved, newQuote: d.quote, status: 'open',
        }),
      ] as unknown as Parameters<typeof appDb.batch>[0])

      await recordClaims(writingId, sourceCanonState, [
        { collection: ref.collection, dbId: ref.dbId, fieldLabel: resolved, quote: d.quote, kind: 'new_detail' },
      ])
    }

    await updateDetailsAction(ref.collection, ref.dbId, nextDetails)
    if (unkId && !ref.tagIds.includes(unkId)) {
      const tagIds = [...ref.tagIds, unkId]
      await updateTagsAction(ref.collection, ref.dbId, tagIds)
      ref.tagIds = tagIds
    }
    ref.details = nextDetails
  }

  // 3. Details that already match canon are logged and nothing more.
  if (plan.confirmations.length > 0) {
    await appDb.insert(schema.continuityConfirmations).values(
      plan.confirmations.map((c) => {
        const ref = refs.get(c.entityId)
        return {
          writingId,
          entryCollection: ref?.collection ?? 'characters',
          entryId: ref?.dbId ?? 0,
          fieldLabel: c.fieldLabel,
          quote: c.quote,
        }
      }).filter((row) => row.entryId !== 0),
    )
    await recordClaims(writingId, sourceCanonState, plan.confirmations.map((c) => {
      const ref = refs.get(c.entityId)
      return ref ? { collection: ref.collection, dbId: ref.dbId, fieldLabel: c.fieldLabel, quote: c.quote, kind: 'match' } : null
    }).filter((row): row is NonNullable<typeof row> => row !== null))
  }

  // 4. Conflicts and possible changes wait for a decision. Skip any that this writing
  // already raised (and that may already have been decided).
  if (plan.flags.length > 0) {
    const existing = await appDb.select({
      entryCollection: schema.continuity.entryCollection,
      entryId: schema.continuity.entryId,
      label: schema.continuity.fieldLabel,
      quote: schema.continuity.newQuote,
    }).from(schema.continuity).where(and(
      eq(schema.continuity.writingId, writingId),
      inArray(schema.continuity.kind, ['conflict', 'possible_change']),
    ))
    const known = new Set(existing.map((e) => `${e.entryCollection}:${e.entryId}|${e.label}|${normalizeForCompare(e.quote)}`))

    for (const f of plan.flags) {
      const ref = refs.get(f.entityId)
      if (!ref) continue
      const key = `${ref.collection}:${ref.dbId}|${f.fieldLabel}|${normalizeForCompare(f.newQuote)}`
      if (known.has(key)) continue
      const flagCode = await assignNextCode('Q')
      await appDb.insert(schema.continuity).values({
        code: flagCode,
        writingId,
        entryCollection: ref.collection,
        entryId: ref.dbId,
        kind: f.kind,
        fieldLabel: f.fieldLabel,
        existingExcerpt: f.existingExcerpt,
        newQuote: f.newQuote,
        explanation: f.explanation || null,
        status: 'open',
      })
      await recordClaims(writingId, sourceCanonState, [
        { collection: ref.collection, dbId: ref.dbId, fieldLabel: f.fieldLabel, quote: f.newQuote, kind: f.kind },
      ])
    }
  }
}
