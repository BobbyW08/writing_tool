'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'
import {
  getEntryByCode, getStoryInvolvesResolved, getEventsForStory, buildCodeMap,
} from '@/lib/world/queries'
import { getWritingByCode, getWritingListByStory, getStoryList, type WritingRecord } from '@/lib/studio/queries'
import { createWriting } from '@/lib/studio/actions'
import { getCheckSummary, listHistoryForWriting } from '@/lib/continuity/queries'
import type { CheckSummary } from '@/components/snippet-check-status'
import type { WritingHistoryRowView } from '@/components/writing-history-panel'
import type { CodeMap } from '@/lib/studio/mention-node'

export type EntryRef = { id: number; code: string; name: string }

export type StoryQuestionsData = {
  storyId: number
  startYear: number | null
  endYear: number | null
  yearLabel: string | null
  summary: string | null
  characters: EntryRef[]
  locations: EntryRef[]
  items: EntryRef[]
  lore: EntryRef[]
  events: EntryRef[]
}

export type BoxPopupData =
  | {
      kind: 'writing'
      writing: WritingRecord
      stories: { id: number; code: string; name: string }[]
      summary: CheckSummary
      codeMap: CodeMap
      history: WritingHistoryRowView[]
      storyQuestions: StoryQuestionsData | null
      openFullPageHref: string
    }
  | { kind: 'notes'; collection: string; id: number; code: string; name: string; body: string | null; openFullPageHref: string }
  | { kind: 'storyless-beat'; name: string }
  | { error: string }

async function buildStoryQuestions(storyId: number): Promise<StoryQuestionsData> {
  const [story] = await appDb.select({
    startYear: schema.stories.startYear, endYear: schema.stories.endYear,
    yearLabel: schema.stories.yearLabel, summary: schema.stories.summary,
  }).from(schema.stories).where(eq(schema.stories.id, storyId))

  const [characters, locations, items, lore, events] = await Promise.all([
    getStoryInvolvesResolved(storyId, 'characters'),
    getStoryInvolvesResolved(storyId, 'locations'),
    getStoryInvolvesResolved(storyId, 'items'),
    getStoryInvolvesResolved(storyId, 'lore'),
    getEventsForStory(storyId).then((evts) => evts.map((e) => ({ id: e.id, code: e.code, name: e.name }))),
  ])

  return {
    storyId,
    startYear: story?.startYear ?? null,
    endYear: story?.endYear ?? null,
    yearLabel: story?.yearLabel ?? null,
    summary: story?.summary ?? null,
    characters, locations, items, lore, events,
  }
}

// Step SB6: a story or beat box's Write area saves to a writing record linked to that story
// (get-or-create, same pattern app/(app)/story-builder/[code]/page.tsx already uses for its
// "Write it myself" card) -- picking the most recently touched piece rather than always creating a
// new one, so reopening the popup lands back on what Bobby was last writing for this story.
async function getOrCreateStoryWriting(storyId: number, fallbackName: string): Promise<WritingRecord> {
  let pieces = await getWritingListByStory(storyId)
  if (pieces.length === 0) {
    const created = await createWriting(`${fallbackName} — untitled`, storyId)
    if (!created.code) throw new Error(created.error ?? 'Could not create a writing record.')
    pieces = await getWritingListByStory(storyId)
  }
  const record = await getWritingByCode(pieces[0].code)
  if (!record) throw new Error('Writing record vanished after creation.')
  return record
}

export async function getBoxPopupDataAction(
  box: { kind: 'entry'; collection: string; code: string } | { kind: 'beat'; code: string }
): Promise<BoxPopupData> {
  try {
    if (box.kind === 'beat') {
      const [beat] = await appDb.select({ id: schema.beats.id, name: schema.beats.name, storyId: schema.beats.storyId })
        .from(schema.beats).where(eq(schema.beats.code, box.code))
      if (!beat) return { error: `No beat found for ${box.code}.` }
      if (beat.storyId == null) return { kind: 'storyless-beat', name: beat.name }
      const writing = await getOrCreateStoryWriting(beat.storyId, beat.name)
      return await loadWritingPopup(writing, null)
    }

    if (box.collection === 'stories') {
      const story = await getEntryByCode('stories', box.code) as { id: number; name: string } | null
      if (!story) return { error: `No story found for ${box.code}.` }
      const writing = await getOrCreateStoryWriting(story.id, story.name)
      return await loadWritingPopup(writing, await buildStoryQuestions(story.id))
    }

    const entry = await getEntryByCode(box.collection, box.code) as { id: number; code: string; name: string; body: string | null } | null
    if (!entry) return { error: `No ${box.collection} entry found for ${box.code}.` }
    return {
      kind: 'notes',
      collection: box.collection,
      id: entry.id,
      code: entry.code,
      name: entry.name,
      body: entry.body,
      openFullPageHref: `/${box.collection}/${entry.code}`,
    }
  } catch (err) {
    return { error: String(err) }
  }
}

async function loadWritingPopup(writing: WritingRecord, storyQuestions: StoryQuestionsData | null): Promise<BoxPopupData> {
  const [summary, codeMap, history, stories] = await Promise.all([
    getCheckSummary(writing.id),
    buildCodeMap([writing.text]),
    listHistoryForWriting(writing.id),
    getStoryList(),
  ])
  return {
    kind: 'writing', writing, stories, summary, codeMap, history, storyQuestions,
    openFullPageHref: `/write/${writing.code}`,
  }
}

// Step SB6: the entry box Write area edits the entry's own `body` notes field directly (plain
// text, not the Markdown-through-Lexical pipeline `writing.text` uses -- the entry read page
// already shows `body` as plain "Notes", lib/world's own doc.body usage).
export async function updateEntryNotesAction(collection: string, id: number, body: string): Promise<{ ok: boolean; error?: string }> {
  const { updateFieldAction } = await import('@/lib/world/actions')
  const res = await updateFieldAction(collection, id, 'body', body)
  if (res.ok) revalidatePath(`/${collection}`)
  return res
}
