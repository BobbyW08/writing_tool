'use server'
import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import { assignNextCode, slugify } from '@/db/codes'
import { syncLinksForRecord, removeRecordLinks } from '@/lib/graph/sync'
import { getWritingByCode, type WritingRecord } from '@/lib/studio/queries'
import { getCheckSummary, type CheckSummary } from '@/lib/continuity/queries'
import { buildCodeMap } from '@/lib/world/queries'
import { writingPlainText } from '@/lib/studio/plain-text'
import type { CodeMap } from '@/lib/studio/mention-node'

export async function createWriting(name: string, storyId?: number | null): Promise<{ code: string; error?: string }> {
  try {
    const code = await assignNextCode('W')
    const base = slugify(name)
    const slug = base ? `${base}-${code.toLowerCase()}` : code.toLowerCase()
    const [row] = await appDb.insert(schema.writing)
      .values({ code, slug, name, kind: 'snippet', canonState: 'draft', text: '', storyId: storyId ?? null })
      .returning({ id: schema.writing.id })
    await syncLinksForRecord('writing', row.id)
    revalidatePath('/write')
    if (storyId != null) revalidatePath('/stories')
    return { code }
  } catch (e) {
    return { code: '', error: String(e) }
  }
}

export async function getWritingWithSummaryAction(code: string): Promise<{ record: WritingRecord; summary: CheckSummary; codeMap: CodeMap } | null> {
  const record = await getWritingByCode(code.toUpperCase())
  if (!record) return null
  const [summary, codeMap] = await Promise.all([getCheckSummary(record.id), buildCodeMap([record.text])])
  return { record, summary, codeMap }
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
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const [before] = await appDb.select({ text: schema.writing.text, startYear: schema.writing.startYear })
      .from(schema.writing).where(eq(schema.writing.id, id)).limit(1)

    const plain = writingPlainText(data.text)
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

    await syncLinksForRecord('writing', id)

    // Continuity check (Phase 4): runs after the response, when the prose or the writing's
    // timeline position changed. Draft and Canon are both checked; Set aside is excluded
    // from every check (traveler-wiki-build-plan.md, "Writing Studio and AI layer", decision 2).
    const textChanged = before && before.text !== data.text
    const yearChanged = before && before.startYear !== data.startYear
    if (data.canonState !== 'set_aside' && (textChanged || yearChanged)) {
      after(async () => {
        const { claimCheck, runContinuityCheck } = await import('@/lib/continuity/run-check')
        const claimed = await claimCheck(id)
        if (claimed) await runContinuityCheck(id)
      })
    }

    revalidatePath('/write')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function deleteWriting(id: number): Promise<{ ok: boolean }> {
  try {
    const rows = await appDb.select({ code: schema.writing.code })
      .from(schema.writing).where(eq(schema.writing.id, id)).limit(1)
    const code = rows[0]?.code

    await appDb.delete(schema.writing).where(eq(schema.writing.id, id))
    if (code) await removeRecordLinks(code)

    revalidatePath('/write')
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
