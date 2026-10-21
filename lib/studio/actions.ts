'use server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { revalidatePath } from 'next/cache'

const EMPTY_LEXICAL = {
  root: {
    type: 'root', direction: 'ltr', format: '', indent: 0, version: 1,
    children: [{
      type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0,
      textFormat: 0, textStyle: '',
      children: [],
    }],
  },
}

export async function createWriting(name: string): Promise<{ code: string; error?: string }> {
  try {
    const payload = await getPayload({ config })
    const doc = await payload.create({
      collection: 'writing',
      data: { name, kind: 'snippet', canonState: 'draft', text: EMPTY_LEXICAL } as never,
    })
    revalidatePath('/write')
    return { code: (doc as unknown as Record<string, unknown>).code as string }
  } catch (e) {
    return { code: '', error: String(e) }
  }
}

export async function saveWriting(
  id: string,
  data: {
    name: string
    kind: string
    canonState: string
    startYear: number | null
    storyId: string | null
    textJson: Record<string, unknown>
    mentionIds: string[]
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const payload = await getPayload({ config })
    const updateData: Record<string, unknown> = {
      name: data.name,
      kind: data.kind,
      canonState: data.canonState,
      text: data.textJson,
    }
    if (data.startYear !== null) updateData.startYear = data.startYear
    if (data.storyId) updateData.story = data.storyId
    if (data.mentionIds.length > 0) updateData.mentions = data.mentionIds
    await payload.update({ collection: 'writing', id, data: updateData as never })
    revalidatePath('/write')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function deleteWriting(id: string): Promise<{ ok: boolean }> {
  try {
    const payload = await getPayload({ config })
    await payload.delete({ collection: 'writing', id })
    revalidatePath('/write')
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

export type SearchResult = {
  id: string
  code: string
  name: string
  collection: string
}

const SEARCH_SLUGS = [
  'characters', 'locations', 'items', 'cultures', 'factions',
  'races', 'languages', 'lore', 'events', 'stories',
] as const

export async function searchEntities(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 1) return []
  const payload = await getPayload({ config })
  const results: SearchResult[] = []
  for (const slug of SEARCH_SLUGS) {
    if (results.length >= 8) break
    const res = await payload.find({
      collection: slug,
      where: { name: { like: query } },
      limit: Math.max(1, 8 - results.length),
      depth: 0,
    })
    for (const doc of res.docs) {
      const d = doc as unknown as Record<string, unknown>
      results.push({ id: String(doc.id), code: String(d.code ?? ''), name: String(d.name ?? ''), collection: slug })
    }
  }
  return results.slice(0, 8)
}
