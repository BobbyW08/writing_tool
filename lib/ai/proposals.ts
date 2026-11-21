// Generates AI proposals for one record and queues them in ai_proposals. Never writes to the
// record itself (hard rule 1 and plan decision 5: "AI proposes, Bobby decides") — only
// lib/ai/actions.ts's acceptProposalAction does that, after Bobby accepts one from the inbox.

import { z } from 'zod'
import { eq, and, desc } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { buildAiContext, formatContextForPrompt, resolveIdForCode } from './context'
import { askAI } from './model'
import type { AiTask, ProposedValue } from './types'

const SUGGEST_SYSTEM = `You help an author of a fictional world think through what is unresolved on one of their records. You are given everything already recorded about it and its connections, each labeled with its standing (Locked canon, In development, UNK, or from Draft writing).

Propose a short list of concrete questions, options, or tensions grounded in what is actually recorded here and in its linked entries -- never a settled fact, a finished answer, or a passage of prose. A vague restatement of what is already written is not useful: point at something specific and unresolved -- an open question worth deciding, two or three distinct directions this could take, or a tension implied by what is already recorded but never spelled out. Each must be consistent with and never contradict anything marked Locked canon or UNK, and never invent a name, a relationship, or a plot event.

Each proposal targets either "summary" (a short note added to the record's summary field; use this rarely, only when the summary is thin or missing) or "detail" (a short label, one to three words, Title Case, and a value of one to three sentences posing the question, option, or tension). Reuse an existing detail label when it continues the same open question rather than inventing a near-duplicate.

Never write a scene or a passage of prose. If nothing good comes to mind, return fewer proposals, or none. Return at most 5.`

const suggestSchema = z.object({
  proposals: z.array(z.object({
    target: z.enum(['summary', 'detail']).default('detail'),
    label: z.string().min(1).max(60).optional(),
    value: z.string().min(1).max(1200),
  })).max(5),
})

export type GenerateResult = { created: number; error?: string }

// task defaults to the Sonnet-class model: a cheap model's proposals came back as vague
// restatements of what was already recorded, not useful questions, options, or tensions.
export async function generateDetailProposals(code: string, task: AiTask = 'deep_suggestions'): Promise<GenerateResult> {
  const ctx = await buildAiContext(code)
  if (!ctx) return { created: 0, error: `No record found for ${code}.` }

  const { output, model } = await askAI({
    task,
    system: SUGGEST_SYSTEM,
    prompt: formatContextForPrompt(ctx),
    schema: suggestSchema,
  })
  if (output.proposals.length === 0) return { created: 0 }

  const targetId = await resolveIdForCode(ctx.code, ctx.collection)
  if (!targetId) return { created: 0, error: `${ctx.code} has no row id to attach proposals to.` }

  const contextCodes = [ctx.code, ...ctx.connections.map((c) => c.code)]
  await appDb.insert(schema.aiProposals).values(
    output.proposals.map((p) => {
      if (p.target === 'summary') {
        return {
          task,
          targetCollection: ctx.collection,
          targetId,
          targetCode: ctx.code,
          kind: 'field' as const,
          fieldLabel: 'Summary',
          proposedValue: { kind: 'field', field: 'summary', value: p.value } satisfies ProposedValue,
          model,
          contextCodes,
        }
      }
      const label = p.label ?? 'Detail'
      return {
        task,
        targetCollection: ctx.collection,
        targetId,
        targetCode: ctx.code,
        kind: 'detail' as const,
        fieldLabel: label,
        proposedValue: { kind: 'detail', label, value: p.value } satisfies ProposedValue,
        model,
        contextCodes,
      }
    })
  )
  return { created: output.proposals.length }
}

export type PendingProposal = {
  id: number
  task: string
  targetCollection: string | null
  targetCode: string | null
  kind: string
  fieldLabel: string | null
  proposedValue: unknown
  model: string
  contextCodes: string[]
  createdAt: Date
}

export async function listPendingProposals(): Promise<PendingProposal[]> {
  const rows = await appDb.select().from(schema.aiProposals)
    .where(eq(schema.aiProposals.state, 'pending'))
    .orderBy(desc(schema.aiProposals.createdAt))
  return rows.map(toPendingProposal)
}

// Powers the "Ask AI anywhere" tray (step S6): only this record's own pending proposals, not the
// whole inbox.
export async function listPendingProposalsForCode(code: string): Promise<PendingProposal[]> {
  const rows = await appDb.select().from(schema.aiProposals)
    .where(and(eq(schema.aiProposals.state, 'pending'), eq(schema.aiProposals.targetCode, code)))
    .orderBy(desc(schema.aiProposals.createdAt))
  return rows.map(toPendingProposal)
}

function toPendingProposal(r: typeof schema.aiProposals.$inferSelect): PendingProposal {
  return {
    id: r.id,
    task: r.task,
    targetCollection: r.targetCollection,
    targetCode: r.targetCode,
    kind: r.kind,
    fieldLabel: r.fieldLabel,
    proposedValue: r.proposedValue,
    model: r.model,
    contextCodes: (r.contextCodes ?? []) as string[],
    createdAt: r.createdAt,
  }
}
