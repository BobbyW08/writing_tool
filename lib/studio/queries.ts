import 'server-only'
import { getPayload } from 'payload'
import config from '@payload-config'

export type WritingListItem = {
  id: string
  code: string
  name: string
  kind: string
  canonState: string
  wordCount: number
  story: { id: string; code: string; name: string } | null
  updatedAt: string
}

export type WritingRecord = {
  id: string
  code: string
  name: string
  kind: string
  canonState: string
  startYear: number | null
  story: { id: string; code: string; name: string } | null
  textJson: Record<string, unknown>
  plainText: string
  updatedAt: string
}

function toStory(s: unknown): { id: string; code: string; name: string } | null {
  if (!s || typeof s !== 'object') return null
  const doc = s as Record<string, unknown>
  return { id: String(doc.id ?? ''), code: String(doc.code ?? ''), name: String(doc.name ?? '') }
}

export async function getWritingList(): Promise<WritingListItem[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection: 'writing', limit: 500, depth: 1, sort: '-updatedAt' })
  return result.docs.map((doc) => {
    const d = doc as unknown as Record<string, unknown>
    const plain = String(d.plainText ?? '')
    return {
      id: String(doc.id),
      code: String(d.code ?? ''),
      name: String(d.name ?? ''),
      kind: String(d.kind ?? 'snippet'),
      canonState: String(d.canonState ?? 'draft'),
      wordCount: plain.trim() ? plain.trim().split(/\s+/).length : 0,
      story: toStory(d.story),
      updatedAt: String(d.updatedAt ?? ''),
    }
  })
}

export async function getWritingByCode(code: string): Promise<WritingRecord | null> {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'writing',
    where: { code: { equals: code } },
    limit: 1,
    depth: 1,
  })
  if (!result.docs.length) return null
  const doc = result.docs[0] as unknown as Record<string, unknown>
  return {
    id: String(doc.id ?? ''),
    code: String(doc.code ?? ''),
    name: String(doc.name ?? ''),
    kind: String(doc.kind ?? 'snippet'),
    canonState: String(doc.canonState ?? 'draft'),
    startYear: typeof doc.startYear === 'number' ? doc.startYear : null,
    story: toStory(doc.story),
    textJson: (doc.text ?? {}) as Record<string, unknown>,
    plainText: String(doc.plainText ?? ''),
    updatedAt: String(doc.updatedAt ?? ''),
  }
}

export async function getStoryList(): Promise<{ id: string; code: string; name: string }[]> {
  const payload = await getPayload({ config })
  const result = await payload.find({ collection: 'stories', limit: 200, depth: 0, sort: 'name' })
  return result.docs.map((doc) => {
    const d = doc as unknown as Record<string, unknown>
    return { id: String(doc.id), code: String(d.code ?? ''), name: String(d.name ?? '') }
  })
}
