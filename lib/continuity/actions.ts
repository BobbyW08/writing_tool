'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { updateDetailsAction, updateFieldAction } from '@/lib/world/actions'
import { DECISION_KINDS, UPDATE_KINDS } from './constants'
import { appendToField, findQuote, replaceRange } from './text'

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

type DetailRow = { label: string; value: string; inInfobox: boolean; id?: string }

const resolveSchema = z.object({
  choice: z.enum(['keep_canon', 'update_canon', 'both_true', 'changed_over_time', 'decide_later']),
  reason: z.string().max(500).optional(),
  context: z.string().max(200).optional(),
  newFieldText: z.string().max(20000).optional(),
})

export type ResolveInput = z.input<typeof resolveSchema>
export type ActionResult = { ok: true } | { ok: false; error: string }

function refresh() {
  revalidatePath('/continuity')
}

// Records Bobby's decision on a conflict and makes it official in the entry record. The flag
// is claimed first, so a double click cannot apply the same decision twice. These are explicit
// decisions he made, so (unlike an automatic addition) they are never tagged UNK.
export async function resolveFlagAction(flagCode: string, input: ResolveInput): Promise<ActionResult> {
  const parsed = resolveSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'That decision could not be read.' }
  const { choice } = parsed.data
  const reason = parsed.data.reason?.trim() || null
  const context = parsed.data.context?.trim() || null
  const newFieldText = parsed.data.newFieldText?.trim() || null

  if ((choice === 'both_true' || choice === 'changed_over_time') && !context) {
    return { ok: false, error: 'Say what makes both true, so the record can explain it.' }
  }
  if (choice === 'update_canon' && !newFieldText) {
    return { ok: false, error: 'The updated field cannot be empty.' }
  }

  const claimed = await appDb.update(schema.continuity)
    .set({ status: 'resolved', choice, reason, context, resolvedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(schema.continuity.code, flagCode.toUpperCase()),
      eq(schema.continuity.status, 'open'),
      inArray(schema.continuity.kind, DECISION_KINDS),
    ))
    .returning()
  const flag = claimed[0]
  if (!flag) return { ok: false, error: 'This item was already resolved.' }

  const table = WORLD_TABLE_MAP[flag.entryCollection]
  if (!table) return { ok: false, error: 'The entry this refers to no longer exists.' }

  try {
    const [entry] = await appDb.select({ id: table.id, details: table.details, status: table.status, gapPrompt: table.gapPrompt })
      .from(table as never).where(eq(table.id, flag.entryId)).limit(1)
    if (!entry) throw new Error('The entry this refers to no longer exists.')
    const details = [...(((entry as { details: DetailRow[] }).details) ?? [])]

    if (choice === 'update_canon') {
      const idx = details.findIndex((d) => d.label.trim().toLowerCase() === flag.fieldLabel.trim().toLowerCase())
      const before = idx >= 0 ? details[idx].value : null
      if (idx >= 0) details[idx] = { ...details[idx], value: newFieldText! }
      else details.push({ label: flag.fieldLabel, value: newFieldText!, inInfobox: false })

      await updateDetailsAction(flag.entryCollection, flag.entryId, details)
      await appDb.insert(schema.continuityHistory).values({
        entryCollection: flag.entryCollection, entryId: flag.entryId, fieldLabel: flag.fieldLabel,
        action: 'updated', oldValue: before, newValue: newFieldText, writingId: flag.writingId, flagId: flag.id,
      })
    } else if (choice === 'both_true' || choice === 'changed_over_time') {
      const key = `${flag.fieldLabel} (${context})`.slice(0, 120)
      const idx = details.findIndex((d) => d.label.trim().toLowerCase() === key.trim().toLowerCase())
      const before = idx >= 0 ? details[idx].value : undefined
      const value = appendToField(before, flag.newQuote)
      if (idx >= 0) details[idx] = { ...details[idx], value }
      else details.push({ label: key, value, inInfobox: false })

      await updateDetailsAction(flag.entryCollection, flag.entryId, details)
      await appDb.insert(schema.continuityHistory).values({
        entryCollection: flag.entryCollection, entryId: flag.entryId, fieldLabel: key,
        action: choice, oldValue: before ?? null, newValue: value, writingId: flag.writingId, flagId: flag.id,
      })
    } else if (choice === 'decide_later') {
      const [writing] = await appDb.select({ name: schema.writing.name }).from(schema.writing).where(eq(schema.writing.id, flag.writingId)).limit(1)
      const note = `Unresolved continuity from "${writing?.name ?? 'a piece of writing'}" (${flag.fieldLabel}): canon says "${flag.existingExcerpt ?? ''}" but the writing says "${flag.newQuote}".`
      const entryStatus = (entry as { status: string }).status
      const entryGapPrompt = (entry as { gapPrompt: string | null }).gapPrompt
      await updateFieldAction(flag.entryCollection, flag.entryId, 'gapPrompt', entryGapPrompt ? `${entryGapPrompt}\n${note}` : note)
      if (entryStatus === 'locked') await updateFieldAction(flag.entryCollection, flag.entryId, 'status', 'in_development')
    }
    // keep_canon changes nothing in canon. The decision log keeps the quote.
  } catch (err) {
    await appDb.update(schema.continuity)
      .set({ status: 'open', choice: null, reason: null, context: null, resolvedAt: null })
      .where(eq(schema.continuity.id, flag.id))
    return { ok: false, error: err instanceof Error ? err.message : 'Could not apply that decision.' }
  }

  refresh()
  return { ok: true }
}

export async function acknowledgeFlagAction(flagCode: string): Promise<void> {
  await appDb.update(schema.continuity)
    .set({ status: 'resolved', choice: 'acknowledged', resolvedAt: new Date(), updatedAt: new Date() })
    .where(and(
      eq(schema.continuity.code, flagCode.toUpperCase()),
      eq(schema.continuity.status, 'open'),
      inArray(schema.continuity.kind, UPDATE_KINDS),
    ))
  refresh()
}

export async function acknowledgeAllUpdatesAction(): Promise<void> {
  await appDb.update(schema.continuity)
    .set({ status: 'resolved', choice: 'acknowledged', resolvedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(schema.continuity.status, 'open'), inArray(schema.continuity.kind, UPDATE_KINDS)))
  refresh()
}

// Takes an automatically added detail back out of the entry, using the exact quote that was
// added. If the field was edited since, it is left alone and Bobby edits it directly.
export async function undoNewDetailAction(flagCode: string): Promise<ActionResult> {
  const [flag] = await appDb.select().from(schema.continuity).where(and(
    eq(schema.continuity.code, flagCode.toUpperCase()),
    eq(schema.continuity.status, 'open'),
    eq(schema.continuity.kind, 'new_detail'),
  )).limit(1)
  if (!flag) return { ok: false, error: 'This item was already handled.' }

  const table = WORLD_TABLE_MAP[flag.entryCollection]
  if (!table) return { ok: false, error: 'The entry no longer exists.' }
  const [entry] = await appDb.select({ details: table.details }).from(table as never).where(eq(table.id, flag.entryId)).limit(1)
  if (!entry) return { ok: false, error: 'The entry no longer exists.' }

  const details = [...(((entry as { details: DetailRow[] }).details) ?? [])]
  const idx = details.findIndex((d) => d.label.trim().toLowerCase() === flag.fieldLabel.trim().toLowerCase())
  const current = idx >= 0 ? details[idx].value : null
  const range = current ? findQuote(current, flag.newQuote) : null
  if (!current || !range) return { ok: false, error: 'That field has been edited since, so it was left alone. Edit it on the entry page.' }

  const next = replaceRange(current, range, '').replace(/\n{3,}/g, '\n\n').trim()
  if (next) details[idx] = { ...details[idx], value: next }
  else details.splice(idx, 1)

  await updateDetailsAction(flag.entryCollection, flag.entryId, details)
  await appDb.insert(schema.continuityHistory).values({
    entryCollection: flag.entryCollection, entryId: flag.entryId, fieldLabel: flag.fieldLabel,
    action: 'undone', oldValue: current, newValue: next || null, writingId: flag.writingId, flagId: flag.id,
  })
  await appDb.update(schema.continuity)
    .set({ status: 'resolved', choice: 'undone', resolvedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.continuity.id, flag.id))

  refresh()
  return { ok: true }
}

// "Leaving Canon" (step S7): reverts one change a piece of writing caused, by history row id
// rather than by an open continuity flag, so it still works after the flag was acknowledged.
// Only an 'added' row (a detail appended to an existing record) is revertible here; 'created'
// (a whole new record) is not, since deleting a record is a bigger, harder to reverse operation
// this action deliberately does not attempt.
export async function revertHistoryRowAction(historyId: number): Promise<ActionResult> {
  const [row] = await appDb.select().from(schema.continuityHistory).where(eq(schema.continuityHistory.id, historyId)).limit(1)
  if (!row) return { ok: false, error: 'That change no longer exists.' }
  if (row.action !== 'added') return { ok: false, error: 'Only an appended detail can be reverted here.' }

  const table = WORLD_TABLE_MAP[row.entryCollection]
  if (!table) return { ok: false, error: 'The entry this refers to no longer exists.' }
  const [entry] = await appDb.select({ details: table.details }).from(table as never).where(eq(table.id, row.entryId)).limit(1)
  if (!entry) return { ok: false, error: 'The entry this refers to no longer exists.' }

  const details = [...(((entry as { details: DetailRow[] }).details) ?? [])]
  const idx = details.findIndex((d) => d.label.trim().toLowerCase() === row.fieldLabel.trim().toLowerCase())
  const current = idx >= 0 ? details[idx].value : null
  if (current === null || current !== row.newValue) {
    return { ok: false, error: 'That field has changed since, so it was left alone. Edit it on the entry page.' }
  }

  if (row.oldValue) details[idx] = { ...details[idx], value: row.oldValue }
  else details.splice(idx, 1)

  await updateDetailsAction(row.entryCollection, row.entryId, details)
  await appDb.insert(schema.continuityHistory).values({
    entryCollection: row.entryCollection, entryId: row.entryId, fieldLabel: row.fieldLabel,
    action: 'reverted', oldValue: row.newValue, newValue: row.oldValue, writingId: row.writingId,
  })

  revalidatePath('/write')
  return { ok: true }
}

// Manual fallback: run the check on demand, outside the automatic save-time trigger.
export async function triggerContinuityCheckAction(writingId: number): Promise<ActionResult> {
  const { claimCheck, runContinuityCheck } = await import('./run-check')
  const claimed = await claimCheck(writingId)
  if (!claimed) return { ok: false, error: 'A check is already running for this piece of writing.' }
  await runContinuityCheck(writingId)
  revalidatePath('/write')
  refresh()
  return { ok: true }
}

// Same, but matching the `() => Promise<void>` shape SnippetCheckStatus's recheckAction prop
// expects (it reads the result back from the record's own checkStatus via router.refresh()).
export async function recheckWritingAction(writingId: number): Promise<void> {
  await triggerContinuityCheckAction(writingId)
}
