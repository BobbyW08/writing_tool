// Review writing (step UX4). CLAUDE.md hard rule 1's one carve-out: a single suggested edit to a
// sentence Bobby already wrote, shown as a before and after, applied only when he accepts that one
// suggestion. The model never invents a sentence, paragraph or scene -- it only proposes a reworded
// span of text that must already exist, word for word, in the piece it claims to come from. Nothing
// here writes anything; lib/ai/review-writing-actions.ts applies exactly one accepted edit at a time.

import { z } from 'zod'
import { and, desc, eq, inArray, ne, notInArray } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { findQuote } from '@/lib/continuity/text'
import { askAI } from './model'
import type { AiTask } from './types'

const STYLE_SAMPLE_PIECES = 3
const STYLE_SAMPLE_CHARS = 500
const MAX_PIECE_CHARS = 6000
const MAX_SUGGESTIONS = 6

const REVIEW_WRITING_SYSTEM = `You help an author polish their own prose. You never invent a sentence, paragraph or scene; you only suggest a better version of a sentence that is already there.

You are given a style sample of the author's own other writing (for voice only, never for content) and one or more pieces of their current writing, each labeled with a code.

Return up to ${MAX_SUGGESTIONS} suggested edits, each for a single sentence or short clause that has a real grammar, style, vocabulary or flow problem. Skip anything that already reads well; return fewer than ${MAX_SUGGESTIONS} if that is all that is warranted. For each suggestion:
- "writingCode" is the code of the piece it comes from.
- "before" must be copied EXACTLY, character for character, from that piece's text as given to you. Never paraphrase, summarize or invent the "before" text.
- "after" is your suggested rewording of exactly that span, in the author's own voice (matched to the style sample), fixing the problem without changing what happens, what is said to be true, or any name, date or fact.
- "reason" is one short phrase naming the problem (for example "run-on sentence", "repeated word", "passive voice").

Never suggest an edit that adds information, changes meaning, or extends beyond fixing the existing words.`

const suggestionSchema = z.object({
  suggestions: z.array(z.object({
    writingCode: z.string().min(1).max(20),
    before: z.string().min(3).max(500),
    after: z.string().min(1).max(500),
    reason: z.string().min(1).max(120),
  })).max(MAX_SUGGESTIONS),
})

export type WritingReviewSuggestion = {
  writingId: number
  writingCode: string
  writingName: string
  before: string
  after: string
  reason: string
}

export type ReviewWritingResult = {
  suggestions: WritingReviewSuggestion[]
  discarded: number
  model?: string
  error?: string
}

// A sample of Bobby's own other Canon/Draft writing, for voice only -- Set aside writing is
// excluded from every AI context (plan decision 2), same as everywhere else in lib/ai/.
async function loadStyleSample(excludeIds: number[]): Promise<string> {
  const conditions = [ne(schema.writing.canonState, 'set_aside')]
  if (excludeIds.length > 0) conditions.push(notInArray(schema.writing.id, excludeIds))

  const rows = await appDb.select({ plainText: schema.writing.plainText })
    .from(schema.writing)
    .where(and(...conditions))
    .orderBy(desc(schema.writing.updatedAt))
    .limit(STYLE_SAMPLE_PIECES)

  const samples = rows
    .map((r) => (r.plainText ?? '').trim())
    .filter(Boolean)
    .map((t) => t.slice(0, STYLE_SAMPLE_CHARS))

  return samples.length > 0 ? samples.join('\n---\n') : '(no other writing yet; keep a plain, natural narrative voice)'
}

export async function generateWritingReviewSuggestions(
  writingIds: number[],
  task: AiTask = 'writing_review',
): Promise<ReviewWritingResult> {
  if (writingIds.length === 0) return { suggestions: [], discarded: 0, error: 'Select at least one piece to review.' }

  const rows = await appDb.select({
    id: schema.writing.id,
    code: schema.writing.code,
    name: schema.writing.name,
    text: schema.writing.text,
    plainText: schema.writing.plainText,
    canonState: schema.writing.canonState,
  }).from(schema.writing).where(inArray(schema.writing.id, writingIds))

  const pieces = rows.filter((r) => r.canonState !== 'set_aside' && (r.plainText ?? '').trim())
  if (pieces.length === 0) {
    return { suggestions: [], discarded: 0, error: 'Nothing here is ready to review yet (Set aside pieces are never reviewed).' }
  }

  const styleSample = await loadStyleSample(pieces.map((p) => p.id))
  const piecesText = pieces
    .map((p) => `--- Piece ${p.code}: "${p.name}" ---\n${(p.plainText ?? '').slice(0, MAX_PIECE_CHARS)}`)
    .join('\n\n')
  const prompt = `Style sample, for voice only:\n${styleSample}\n\nPieces to review:\n${piecesText}`

  const { output, model } = await askAI({ task, system: REVIEW_WRITING_SYSTEM, prompt, schema: suggestionSchema })

  const byCode = new Map(pieces.map((p) => [p.code.toUpperCase(), p]))
  const suggestions: WritingReviewSuggestion[] = []
  let discarded = 0

  for (const s of output.suggestions) {
    const piece = byCode.get(s.writingCode.trim().toUpperCase())
    if (!piece) { discarded++; continue }
    // Honest limit (same spirit as the continuity check's "discarded" count): a suggestion whose
    // exact wording cannot be found in the piece's own stored text -- for example because it
    // crosses a [words](C4) mention -- is never shown or applied.
    const range = findQuote(piece.text ?? '', s.before)
    if (!range) { discarded++; continue }
    const exactBefore = (piece.text ?? '').slice(range.start, range.end)
    suggestions.push({
      writingId: piece.id,
      writingCode: piece.code,
      writingName: piece.name,
      before: exactBefore,
      after: s.after.trim(),
      reason: s.reason.trim(),
    })
  }

  return { suggestions, discarded, model }
}
