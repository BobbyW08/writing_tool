// The one function every AI call in the app goes through (step S4 decision 8). Reads the model
// for the task from ai_settings, calls it through the Vercel AI SDK and the @ai-sdk/anthropic
// provider, and returns parsed, schema-checked output. Never prints the key.

import { anthropic } from '@ai-sdk/anthropic'
import { generateText, Output } from 'ai'
import type { z } from 'zod'
import { getModelForTask } from './settings'
import type { AiTask } from './types'

export type AskAiInput<S extends z.ZodType> = {
  task: AiTask
  system: string
  prompt: string
  schema: S
}

export type AskAiResult<S extends z.ZodType> = {
  output: z.infer<S>
  model: string
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
}

export async function askAI<S extends z.ZodType>(input: AskAiInput<S>): Promise<AskAiResult<S>> {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set')
  const model = await getModelForTask(input.task)

  const { output, usage } = await generateText({
    model: anthropic(model),
    system: input.system,
    prompt: input.prompt,
    temperature: 0,
    output: Output.object({ schema: input.schema }),
  })
  if (!output) throw new Error('The model returned no structured answer')

  return {
    output: output as z.infer<S>,
    model,
    usage: {
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      totalTokens: usage?.totalTokens ?? 0,
    },
  }
}
