// "Ask AI anything" (step SB7's one built chip; the rest in the plan's "more helper ideas" list
// stay optional, future additions). Same shape as generateBeatCards: one bounded call, Bobby's own
// question plus the record's context, a schema-checked answer, nothing ever written.

import { z } from 'zod'
import { buildAiContext, formatContextForPrompt } from './context'
import { askAI } from './model'

const ASK_ANYTHING_SYSTEM = `You help an author think through a story they are writing. You are given the record's own recorded facts and connections, each labeled with its standing, and a question from the author. Answer the question directly and concisely, grounded in what you were given. Never contradict anything marked Locked canon or UNK, and never write prose meant to be read as the story itself -- only your own answer to the question.`

const askAnythingSchema = z.object({ answer: z.string().min(1).max(2000) })

export async function askAnything(code: string, question: string): Promise<{ answer?: string; error?: string }> {
  const ctx = await buildAiContext(code.trim().toUpperCase())
  if (!ctx) return { error: `No record found for ${code}.` }

  const prompt = `${formatContextForPrompt(ctx)}\n\nQuestion: ${question.trim()}`
  const { output } = await askAI({ task: 'quick_suggestions', system: ASK_ANYTHING_SYSTEM, prompt, schema: askAnythingSchema })
  return { answer: output.answer }
}
