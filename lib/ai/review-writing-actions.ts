'use server'

// Server actions for Review writing (step UX4). getReviewWritingSuggestionsAction only reads and
// calls the model -- nothing is saved. acceptReviewWritingSuggestionAction is the one place a
// Review writing edit is ever applied, and only for the exact "before" text it was shown with
// (hard rule 1: nothing is applied without this explicit accept).

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { ensureBuiltinTags } from '@/db/tags'
import { updateTagsAction } from '@/lib/world/actions'
import { syncLinksForRecord } from '@/lib/graph/sync'
import { writingPlainText } from '@/lib/studio/plain-text'
import { findQuote, replaceRange } from '@/lib/continuity/text'
import { generateWritingReviewSuggestions, type WritingReviewSuggestion } from './review-writing'

export async function getReviewWritingSuggestionsAction(
  writingIds: number[],
): Promise<{ ok: boolean; suggestions?: WritingReviewSuggestion[]; discarded?: number; error?: string }> {
  try {
    const result = await generateWritingReviewSuggestions(writingIds)
    if (result.error) return { ok: false, error: result.error }
    return { ok: true, suggestions: result.suggestions, discarded: result.discarded }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// Applies exactly one accepted edit, by locating the "before" text again in the piece's current
// stored markdown (never by position), so an edit made elsewhere in the meantime is never
// clobbered. Tags the piece UNK and AI suggested (plan decision 6), the same as every other
// accepted AI text, and reruns the continuity check since the prose changed.
export async function acceptReviewWritingSuggestionAction(
  writingId: number,
  before: string,
  after_: string,
): Promise<{ ok: boolean; error?: string }> {
  const [row] = await appDb.select({
    id: schema.writing.id,
    text: schema.writing.text,
    tagIds: schema.writing.tagIds,
  }).from(schema.writing).where(eq(schema.writing.id, writingId)).limit(1)
  if (!row) return { ok: false, error: 'This piece of writing no longer exists.' }

  const current = row.text ?? ''
  const range = findQuote(current, before)
  if (!range) return { ok: false, error: 'That sentence has changed since this suggestion was made.' }

  const nextText = replaceRange(current, range, after_)
  const nextPlain = writingPlainText(nextText)

  await appDb.update(schema.writing).set({
    text: nextText,
    plainText: nextPlain,
    reviewNote: 'A sentence was reworded by Review writing (AI suggested). Double check before removing UNK.',
    updatedAt: new Date(),
  }).where(eq(schema.writing.id, writingId))

  const { unkId, aiId } = await ensureBuiltinTags()
  const existingTags = (row.tagIds ?? []) as number[]
  const nextTags = Array.from(new Set([...existingTags, unkId, aiId]))
  await updateTagsAction('writing', writingId, nextTags)

  await syncLinksForRecord('writing', writingId)

  after(async () => {
    const { claimCheck, runContinuityCheck } = await import('@/lib/continuity/run-check')
    const claimed = await claimCheck(writingId)
    if (claimed) await runContinuityCheck(writingId)
  })

  revalidatePath('/write')
  return { ok: true }
}
