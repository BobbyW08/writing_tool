// "What could happen next" cards for the Story Builder (step S5). Cards are never saved until
// Bobby picks one (plan decision 5: "AI proposes, Bobby decides") -- this only returns candidates,
// it never writes a beats row itself. The lane shows a button rather than suggesting as Bobby
// types, so this stays one bounded call per click (hard limit: keep AI calls few and small).

import { z } from 'zod'
import { eq, asc } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { buildAiContext, formatContextForPrompt, resolveIdForCode } from './context'
import { askAI } from './model'
import type { AiTask } from './types'

const BEAT_CARDS_SYSTEM = `You help an author plan the next beat in one of their stories. You are given the story's own recorded facts and connections, each labeled with its standing, and the beats already planned for it, in order.

Propose up to 3 different, distinct possibilities for what could happen next. Each is a short beat: a name (a few words) and a summary of one or two sentences describing what happens, not how it reads. Vary the three in direction or tone (for example a quiet beat, a complication, a turn) rather than three versions of the same idea. Never write a scene, a line of dialogue, or any prose meant to be read as the story itself -- only what could happen. Never contradict anything marked Locked canon or UNK.`

const beatCardsSchema = z.object({
  cards: z.array(z.object({
    name: z.string().min(1).max(80),
    summary: z.string().min(1).max(500),
  })).max(3),
})

export type BeatCard = { name: string; summary: string }

export async function generateBeatCards(storyCode: string, task: AiTask = 'quick_suggestions'): Promise<{ cards: BeatCard[]; error?: string }> {
  const upper = storyCode.trim().toUpperCase()
  const ctx = await buildAiContext(upper)
  if (!ctx || ctx.collection !== 'stories') return { cards: [], error: `No story found for ${storyCode}.` }

  const storyId = await resolveIdForCode(ctx.code, 'stories')
  const existingBeats = storyId
    ? await appDb.select({ name: schema.beats.name, summary: schema.beats.summary })
        .from(schema.beats).where(eq(schema.beats.storyId, storyId)).orderBy(asc(schema.beats.order))
    : []

  const beatsText = existingBeats.length
    ? existingBeats.map((b, i) => `${i + 1}. ${b.name}${b.summary ? ` — ${b.summary}` : ''}`).join('\n')
    : '(no beats planned yet)'

  const prompt = `${formatContextForPrompt(ctx)}\n\nBeats planned so far, in order:\n${beatsText}`

  const { output } = await askAI({ task, system: BEAT_CARDS_SYSTEM, prompt, schema: beatCardsSchema })
  return { cards: output.cards }
}
