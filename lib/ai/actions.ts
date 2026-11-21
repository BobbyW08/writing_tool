'use server'

import { revalidatePath } from 'next/cache'
import { eq, and } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { ensureBuiltinTags } from '@/db/tags'
import { updateDetailsAction, updateFieldAction, updateTagsAction } from '@/lib/world/actions'
import { generateDetailProposals, listPendingProposalsForCode, type PendingProposal } from './proposals'
import { generateBeatCards, type BeatCard } from './beats'
import { generatePromptAnswers, getPromptById, listPromptGroupsForCollection, type PromptGroup } from './prompts'
import { buildAiContext, resolveIdForCode } from './context'
import type { ProposedValue } from './types'

type DetailRow = { label: string; value: string; inInfobox: boolean; id?: string }
type AnyTable = typeof schema.characters
const TABLE_MAP: Record<string, AnyTable> = {
  characters: schema.characters as unknown as AnyTable,
  locations: schema.locations as unknown as AnyTable,
  items: schema.items as unknown as AnyTable,
  cultures: schema.cultures as unknown as AnyTable,
  factions: schema.factions as unknown as AnyTable,
  races: schema.races as unknown as AnyTable,
  languages: schema.languages as unknown as AnyTable,
  lore: schema.lore as unknown as AnyTable,
  events: schema.events as unknown as AnyTable,
  stories: schema.stories as unknown as AnyTable,
  beats: schema.beats as unknown as AnyTable,
}

async function getDetails(collection: string, id: number): Promise<DetailRow[]> {
  const table = TABLE_MAP[collection]
  if (!table) return []
  const [row] = await appDb.select({ details: table.details }).from(table as never).where(eq(table.id, id)).limit(1)
  return ((row as { details: DetailRow[] | null } | undefined)?.details) ?? []
}

async function getTagIds(collection: string, id: number): Promise<number[]> {
  const table = TABLE_MAP[collection]
  if (!table) return []
  const [row] = await appDb.select({ tagIds: table.tagIds }).from(table as never).where(eq(table.id, id)).limit(1)
  return ((row as { tagIds: number[] | null } | undefined)?.tagIds) ?? []
}

// ─── generateProposalsAction ───────────────────────────────────────────────────
// Keep AI calls few and small: this makes exactly one model call for the given code.
export async function generateProposalsAction(code: string): Promise<{ ok: boolean; created?: number; error?: string }> {
  try {
    const result = await generateDetailProposals(code.trim().toUpperCase())
    if (result.error) return { ok: false, error: result.error }
    revalidatePath('/ai-inbox')
    return { ok: true, created: result.created }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ─── generateBeatCardsAction ────────────────────────────────────────────────────
// Read-only: returns candidates for the Story Builder's lane to show. Nothing is saved until
// Bobby picks one, which the client then saves with createBeatAction.
export async function generateBeatCardsAction(storyCode: string): Promise<{ ok: boolean; cards?: BeatCard[]; error?: string }> {
  try {
    const result = await generateBeatCards(storyCode)
    if (result.error) return { ok: false, error: result.error }
    return { ok: true, cards: result.cards }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ─── listProposalsForCodeAction ──────────────────────────────────────────────────
// Powers the "Ask AI anywhere" tray on entry pages (step S6): this record's own pending
// proposals only, not the whole inbox.
export async function listProposalsForCodeAction(code: string): Promise<{ ok: boolean; proposals?: PendingProposal[]; error?: string }> {
  try {
    const proposals = await listPendingProposalsForCode(code.trim().toUpperCase())
    return { ok: true, proposals }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ─── listPromptGroupsAction ──────────────────────────────────────────────────────
export async function listPromptGroupsAction(collection: string): Promise<{ ok: boolean; groups?: PromptGroup[]; error?: string }> {
  try {
    const groups = await listPromptGroupsForCollection(collection)
    return { ok: true, groups }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ─── answerPromptMyselfAction ────────────────────────────────────────────────────
// Prompts menu, "Answer it myself": adds a blank details row labeled by the prompt, so the
// existing details editor on the page is where Bobby actually writes the answer. A no-op if the
// row already exists (the prompt already has an answer).
export async function answerPromptMyselfAction(
  collection: string,
  id: number,
  detailLabel: string
): Promise<{ ok: boolean; error?: string }> {
  const current = await getDetails(collection, id)
  if (current.some((d) => d.label.trim().toLowerCase() === detailLabel.trim().toLowerCase())) {
    return { ok: true }
  }
  const next = [...current, { label: detailLabel, value: '', inInfobox: false }]
  const result = await updateDetailsAction(collection, id, next)
  if (!result.ok) return { ok: false, error: result.error ?? 'Could not add that row.' }
  revalidatePath(`/${collection}`)
  return { ok: true }
}

// ─── generatePromptOptionsAction ─────────────────────────────────────────────────
// Prompts menu, "Ask AI": one model call for exactly three candidate answers to one question,
// queued as three ai_proposals rows so accepting one goes through the same acceptProposalAction
// as every other proposal (hard rule 1: nothing reaches the record without an explicit accept).
export async function generatePromptOptionsAction(
  code: string,
  promptId: number
): Promise<{ ok: boolean; options?: { id: number; value: string }[]; error?: string }> {
  try {
    const prompt = await getPromptById(promptId)
    if (!prompt) return { ok: false, error: 'That prompt no longer exists.' }

    const upperCode = code.trim().toUpperCase()
    const result = await generatePromptAnswers(upperCode, promptId)
    if (result.error) return { ok: false, error: result.error }
    if (result.answers.length === 0) return { ok: false, error: 'The model returned no answers.' }

    const ctx = await buildAiContext(upperCode)
    if (!ctx) return { ok: false, error: `No record found for ${upperCode}.` }
    const targetId = await resolveIdForCode(ctx.code, ctx.collection)
    if (!targetId) return { ok: false, error: `${ctx.code} has no row id to attach proposals to.` }

    const contextCodes = [ctx.code, ...ctx.connections.map((c) => c.code)]
    const rows = await appDb.insert(schema.aiProposals).values(
      result.answers.map((value) => ({
        task: 'quick_suggestions' as const,
        targetCollection: ctx.collection,
        targetId,
        targetCode: ctx.code,
        kind: 'detail' as const,
        fieldLabel: prompt.detailLabel,
        proposedValue: { kind: 'detail', label: prompt.detailLabel, value } satisfies ProposedValue,
        model: result.model,
        contextCodes,
      }))
    ).returning({ id: schema.aiProposals.id, proposedValue: schema.aiProposals.proposedValue })

    return {
      ok: true,
      options: rows.map((r) => ({ id: r.id, value: (r.proposedValue as { value: string }).value })),
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

// ─── rejectProposalAction ───────────────────────────────────────────────────────
export async function rejectProposalAction(id: number): Promise<{ ok: boolean; error?: string }> {
  const rows = await appDb.update(schema.aiProposals)
    .set({ state: 'rejected', resolvedAt: new Date() })
    .where(and(eq(schema.aiProposals.id, id), eq(schema.aiProposals.state, 'pending')))
    .returning()
  if (!rows[0]) return { ok: false, error: 'This proposal was already handled.' }
  revalidatePath('/ai-inbox')
  return { ok: true }
}

// ─── acceptProposalAction ───────────────────────────────────────────────────────
// Applies the proposal through the same write functions as everything else (updateDetailsAction /
// updateFieldAction), so the link index stays in sync, then tags the record UNK and AI suggested
// (plan decision 6). Nothing here is applied without this explicit accept.
export async function acceptProposalAction(id: number): Promise<{ ok: boolean; error?: string }> {
  const claimed = await appDb.update(schema.aiProposals)
    .set({ state: 'accepted', resolvedAt: new Date() })
    .where(and(eq(schema.aiProposals.id, id), eq(schema.aiProposals.state, 'pending')))
    .returning()
  const proposal = claimed[0]
  if (!proposal) return { ok: false, error: 'This proposal was already handled.' }

  try {
    const value = proposal.proposedValue as ProposedValue
    const collection = proposal.targetCollection
    const targetId = proposal.targetId
    if (!collection || !targetId) throw new Error('This proposal has no target record.')

    if (value.kind === 'detail') {
      const current = await getDetails(collection, targetId)
      const idx = current.findIndex((d) => d.label.trim().toLowerCase() === value.label.trim().toLowerCase())
      const next = idx >= 0
        ? current.map((d, i) => (i === idx ? { ...d, value: `${d.value}\n\n${value.value}` } : d))
        : [...current, { label: value.label, value: value.value, inInfobox: false }]
      const result = await updateDetailsAction(collection, targetId, next)
      if (!result.ok) throw new Error(result.error ?? 'Could not save that detail.')
    } else if (value.kind === 'field') {
      const result = await updateFieldAction(collection, targetId, value.field, value.value)
      if (!result.ok) throw new Error(result.error ?? 'Could not save that field.')
    } else {
      throw new Error('Beat proposals need the beats collection, which step S5 adds.')
    }

    const { unkId, aiId } = await ensureBuiltinTags()
    const existingTags = await getTagIds(collection, targetId)
    const nextTags = Array.from(new Set([...existingTags, unkId, aiId]))
    await updateTagsAction(collection, targetId, nextTags, 'Added by AI suggestion. Double check before removing UNK.')
  } catch (err) {
    await appDb.update(schema.aiProposals)
      .set({ state: 'pending', resolvedAt: null })
      .where(eq(schema.aiProposals.id, id))
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  revalidatePath('/ai-inbox')
  if (proposal.targetCollection) revalidatePath(`/${proposal.targetCollection}`)
  return { ok: true }
}
