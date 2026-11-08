'use server'
import { revalidatePath } from 'next/cache'
import { eq, or, like } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { assignNextCode, slugify } from '@/db/codes'

export async function createWriting(name: string): Promise<{ code: string; error?: string }> {
  try {
    const code = await assignNextCode('W')
    const base = slugify(name)
    const slug = base ? `${base}-${code.toLowerCase()}` : code.toLowerCase()
    await appDb.insert(schema.writing).values({ code, slug, name, kind: 'snippet', canonState: 'draft', text: '' })
    revalidatePath('/write')
    return { code }
  } catch (e) {
    return { code: '', error: String(e) }
  }
}

export async function saveWriting(
  id: number,
  data: {
    name: string
    kind: string
    canonState: string
    startYear: number | null
    storyId: number | null
    text: string
    mentionIds: number[]
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const plain = data.text.replace(/[#*_~`>\[\]]/g, '').replace(/\s+/g, ' ').trim()
    await appDb.update(schema.writing).set({
      name: data.name,
      kind: data.kind,
      canonState: data.canonState,
      startYear: data.startYear,
      storyId: data.storyId,
      text: data.text,
      plainText: plain,
      updatedAt: new Date(),
    }).where(eq(schema.writing.id, id))

    // Sync mentions
    await appDb.delete(schema.writingMentions).where(eq(schema.writingMentions.writingId, id))
    if (data.mentionIds.length > 0) {
      // mentionIds are entity DB ids flattened — we don't have collection here;
      // writingMentions records are optional for display only. Skip for now until
      // the continuity layer (Phase 4) supplies collection context.
    }

    revalidatePath('/write')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function deleteWriting(id: number): Promise<{ ok: boolean }> {
  try {
    await appDb.delete(schema.writing).where(eq(schema.writing.id, id))
    revalidatePath('/write')
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

export type SearchResult = {
  id: number
  code: string
  name: string
  collection: string
}

type AnyTable = typeof schema.characters
const SEARCH_TABLE_MAP: { slug: string; table: AnyTable }[] = [
  { slug: 'characters', table: schema.characters as unknown as AnyTable },
  { slug: 'locations', table: schema.locations as unknown as AnyTable },
  { slug: 'items', table: schema.items as unknown as AnyTable },
  { slug: 'cultures', table: schema.cultures as unknown as AnyTable },
  { slug: 'factions', table: schema.factions as unknown as AnyTable },
  { slug: 'races', table: schema.races as unknown as AnyTable },
  { slug: 'languages', table: schema.languages as unknown as AnyTable },
  { slug: 'lore', table: schema.lore as unknown as AnyTable },
]

export async function searchEntities(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 1) return []
  const results: SearchResult[] = []
  const codePattern = /^[A-Z]\d+$/i.test(query.trim())

  for (const { slug, table } of SEARCH_TABLE_MAP) {
    if (results.length >= 8) break
    const rows = await appDb.select({
      id: table.id,
      code: table.code,
      name: table.name,
    })
      .from(table as never)
      .where(
        codePattern
          ? eq(table.code, query.toUpperCase())
          : like(table.name, `%${query}%`)
      )
      .limit(Math.max(1, 8 - results.length))
    for (const r of rows as { id: number; code: string; name: string }[]) {
      results.push({ id: r.id, code: r.code, name: r.name, collection: slug })
    }
  }

  // Also search events and stories
  if (results.length < 8) {
    const evts = await appDb.select({ id: schema.events.id, code: schema.events.code, name: schema.events.name })
      .from(schema.events)
      .where(codePattern ? eq(schema.events.code, query.toUpperCase()) : like(schema.events.name, `%${query}%`))
      .limit(Math.max(1, 8 - results.length))
    for (const r of evts) results.push({ id: r.id, code: r.code, name: r.name, collection: 'events' })
  }

  return results.slice(0, 8)
}
