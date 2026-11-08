import 'server-only'
import { desc, eq } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'

export type WritingListItem = {
  id: number
  code: string
  name: string
  kind: string
  canonState: string
  wordCount: number
  storyId: number | null
  storyCode: string | null
  storyName: string | null
  updatedAt: Date
}

export type WritingRecord = {
  id: number
  code: string
  name: string
  kind: string
  canonState: string
  startYear: number | null
  storyId: number | null
  storyCode: string | null
  storyName: string | null
  text: string
  plainText: string
  updatedAt: Date
}

export async function getWritingList(): Promise<WritingListItem[]> {
  const rows = await appDb.select().from(schema.writing).orderBy(desc(schema.writing.updatedAt)).limit(500)

  const storyIds = [...new Set(rows.map(r => r.storyId).filter((id): id is number => id != null))]
  const storiesMap = new Map<number, { code: string; name: string }>()
  if (storyIds.length > 0) {
    const storyRows = await appDb.select({ id: schema.stories.id, code: schema.stories.code, name: schema.stories.name })
      .from(schema.stories)
    for (const s of storyRows) storiesMap.set(s.id, { code: s.code, name: s.name })
  }

  return rows.map((r) => {
    const plain = r.plainText ?? ''
    const story = r.storyId ? storiesMap.get(r.storyId) : null
    return {
      id: r.id,
      code: r.code,
      name: r.name,
      kind: r.kind ?? 'snippet',
      canonState: r.canonState,
      wordCount: plain.trim() ? plain.trim().split(/\s+/).length : 0,
      storyId: r.storyId ?? null,
      storyCode: story?.code ?? null,
      storyName: story?.name ?? null,
      updatedAt: r.updatedAt,
    }
  })
}

export async function getWritingByCode(code: string): Promise<WritingRecord | null> {
  const upper = code.toUpperCase()
  const rows = await appDb.select().from(schema.writing).where(eq(schema.writing.code, upper)).limit(1)
  if (!rows[0]) return null
  const r = rows[0]
  let storyCode: string | null = null
  let storyName: string | null = null
  if (r.storyId) {
    const s = await appDb.select({ code: schema.stories.code, name: schema.stories.name })
      .from(schema.stories).where(eq(schema.stories.id, r.storyId)).limit(1)
    storyCode = s[0]?.code ?? null
    storyName = s[0]?.name ?? null
  }
  return {
    id: r.id,
    code: r.code,
    name: r.name,
    kind: r.kind ?? 'snippet',
    canonState: r.canonState,
    startYear: r.startYear ?? null,
    storyId: r.storyId ?? null,
    storyCode,
    storyName,
    text: r.text ?? '',
    plainText: r.plainText ?? '',
    updatedAt: r.updatedAt,
  }
}

export async function getStoryList(): Promise<{ id: number; code: string; name: string }[]> {
  return appDb.select({ id: schema.stories.id, code: schema.stories.code, name: schema.stories.name })
    .from(schema.stories)
    .orderBy(schema.stories.name)
}
