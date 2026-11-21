// The prompts menu's data access (step S6). Script-safe: no 'server-only' import, same reasoning
// as lib/ai/context.ts, so scripts/seed-prompt-sets.ts and any future test script can use it
// directly against the real database.

import { eq, asc } from 'drizzle-orm'
import { z } from 'zod'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { buildAiContext, formatContextForPrompt } from './context'
import { askAI } from './model'
import type { AiTask } from './types'

export type PromptRow = {
  id: number
  collection: string
  group: string
  label: string
  question: string
  detailLabel: string
  order: number
}

export type PromptGroup = { group: string; prompts: PromptRow[] }

// Grouped in the order rows were seeded, which is the order they should display in.
export async function listPromptGroupsForCollection(collection: string): Promise<PromptGroup[]> {
  const rows = await appDb.select().from(schema.promptSets)
    .where(eq(schema.promptSets.collection, collection))
    .orderBy(asc(schema.promptSets.id))
  const active = rows.filter((r) => r.active)

  const byGroup = new Map<string, PromptRow[]>()
  for (const r of active) {
    const list = byGroup.get(r.group) ?? []
    list.push({ id: r.id, collection: r.collection, group: r.group, label: r.label, question: r.question, detailLabel: r.detailLabel, order: r.order })
    byGroup.set(r.group, list)
  }
  for (const list of byGroup.values()) list.sort((a, b) => a.order - b.order)
  return Array.from(byGroup.entries()).map(([group, prompts]) => ({ group, prompts }))
}

export async function getPromptById(id: number): Promise<PromptRow | null> {
  const [row] = await appDb.select().from(schema.promptSets).where(eq(schema.promptSets.id, id)).limit(1)
  if (!row) return null
  return { id: row.id, collection: row.collection, group: row.group, label: row.label, question: row.question, detailLabel: row.detailLabel, order: row.order }
}

// ─── Ask AI for one prompt ──────────────────────────────────────────────────────

const PROMPT_ANSWER_SYSTEM = `You help an author of a fictional world answer one specific worldbuilding question about a record. You are given everything already recorded about it and its connections, each labeled with its standing (Locked canon, In development, UNK, or from Draft writing).

Answer the single question you are given with exactly three distinct, specific, short candidate answers (one to three sentences each). Each must be consistent with everything marked Locked canon or UNK; do not contradict it. Never invent a name, a relationship, or a plot event that is not already implied by the context. Never write a scene or a passage of prose, only a direct answer to the question.`

const promptAnswerSchema = z.object({
  answers: z.array(z.string().min(1).max(600)).length(3),
})

export type PromptAnswerResult = { answers: string[]; model: string; error?: string }

// task defaults to the cheap model: three short candidate answers to one question.
export async function generatePromptAnswers(code: string, promptId: number, task: AiTask = 'quick_suggestions'): Promise<PromptAnswerResult> {
  const prompt = await getPromptById(promptId)
  if (!prompt) return { answers: [], model: '', error: 'That prompt no longer exists.' }

  const ctx = await buildAiContext(code)
  if (!ctx) return { answers: [], model: '', error: `No record found for ${code}.` }

  const { output, model } = await askAI({
    task,
    system: PROMPT_ANSWER_SYSTEM,
    prompt: `${formatContextForPrompt(ctx)}\n\nQuestion: ${prompt.question}`,
    schema: promptAnswerSchema,
  })
  return { answers: output.answers, model }
}
