// Which Claude model each AI task uses (ai_settings table). Upserts a default row on first read,
// the same pattern as timeline_settings, so a fresh database always has a working value. No
// server-only or 'use server' imports, so scripts can read and change this directly.

import { eq } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { DEFAULT_MODELS, type AiTask } from './types'

export async function getModelForTask(task: AiTask): Promise<string> {
  const rows = await appDb.select({ model: schema.aiSettings.model }).from(schema.aiSettings)
    .where(eq(schema.aiSettings.task, task)).limit(1)
  if (rows[0]) return rows[0].model

  const model = DEFAULT_MODELS[task]
  await appDb.insert(schema.aiSettings).values({ task, model })
    .onConflictDoNothing({ target: schema.aiSettings.task })
  return model
}

export async function setModelForTask(task: AiTask, model: string): Promise<void> {
  await appDb.insert(schema.aiSettings).values({ task, model, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schema.aiSettings.task, set: { model, updatedAt: new Date() } })
}

export async function listAiSettings(): Promise<{ task: string; model: string }[]> {
  const tasks = Object.keys(DEFAULT_MODELS) as AiTask[]
  return Promise.all(tasks.map(async (task) => ({ task, model: await getModelForTask(task) })))
}
