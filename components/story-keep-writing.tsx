'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { WritingEditor } from '@/app/(app)/write/[code]/editor'
import { createWriting, getWritingWithSummaryAction } from '@/lib/studio/actions'
import type { WritingListItem, WritingRecord } from '@/lib/studio/queries'
import type { CheckSummary } from '@/components/snippet-check-status'
import type { CodeMap } from '@/lib/studio/mention-node'

const NEW_VALUE = '__new__'

const KIND_LABELS: Record<string, string> = {
  chapter: 'Chapter',
  scene: 'Scene',
  snippet: 'Snippet',
}

const STATE_LABELS: Record<string, string> = {
  draft: 'Draft',
  canon: 'Canon',
  set_aside: 'Set aside',
}

// The story's own "keep writing" area (Step U3). Reuses the exact Writing Studio editor
// component (same Lexical surface, same autosave) so the two never drift apart, but adds the
// picker and record list that only make sense in a story's context.
export function StoryKeepWriting({
  storyId,
  storyName,
  allStories,
  initialRecord,
  initialSummary,
  initialCodeMap,
  initialList,
}: {
  storyId: number
  storyName: string
  allStories: { id: number; code: string; name: string }[]
  initialRecord: WritingRecord
  initialSummary: CheckSummary
  initialCodeMap: CodeMap
  initialList: WritingListItem[]
}) {
  const [list, setList] = useState(initialList)
  const [record, setRecord] = useState(initialRecord)
  const [summary, setSummary] = useState(initialSummary)
  const [codeMap, setCodeMap] = useState(initialCodeMap)
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()

  async function switchTo(code: string) {
    setLoading(true)
    const result = await getWritingWithSummaryAction(code)
    if (result) {
      setRecord(result.record)
      setSummary(result.summary)
      setCodeMap(result.codeMap)
    }
    setLoading(false)
  }

  async function handlePickerChange(value: string) {
    if (value === NEW_VALUE) {
      setLoading(true)
      const result = await createWriting(`${storyName} — new`, storyId)
      if (result.code) {
        const full = await getWritingWithSummaryAction(result.code)
        if (full) {
          setList((prev) => [
            {
              id: full.record.id,
              code: full.record.code,
              name: full.record.name,
              kind: full.record.kind,
              canonState: full.record.canonState,
              wordCount: 0,
              storyId,
              storyCode: null,
              storyName: null,
              updatedAt: full.record.updatedAt,
            },
            ...prev,
          ])
          setRecord(full.record)
          setSummary(full.summary)
          setCodeMap(full.codeMap)
        }
      }
      setLoading(false)
      return
    }
    await switchTo(value)
  }

  // Refresh this record's row in the list (name/kind/canonState/word count) after a save inside
  // the embedded editor, without re-fetching the whole list from the server.
  function handleSaved(patch: Partial<WritingListItem>) {
    setList((prev) => prev.map((w) => (w.id === record.id ? { ...w, ...patch } : w)))
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground">Keep writing</h2>
        <select
          value={record.code}
          onChange={(e) => startTransition(() => handlePickerChange(e.target.value))}
          disabled={loading}
          className="rounded-md border px-2 py-1 text-sm"
        >
          {list.map((w) => (
            <option key={w.id} value={w.code}>
              {w.code} — {w.name || 'Untitled'}
            </option>
          ))}
          <option value={NEW_VALUE}>+ New writing for this story</option>
        </select>
      </div>

      <div className={`rounded-lg border ${loading ? 'opacity-60' : ''}`}>
        <div className="px-6 pt-2">
          <WritingEditor
            key={record.id}
            record={record}
            stories={allStories}
            summary={summary}
            codeMap={codeMap}
            onFieldsSaved={handleSaved}
          />
        </div>
      </div>

      {list.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            This story&apos;s writing
          </p>
          <ul className="divide-y rounded-md border text-sm">
            {list.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <Link href={`/write/${w.code}`} className="min-w-0 flex-1 truncate hover:underline">
                  {w.name || 'Untitled'}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground">{KIND_LABELS[w.kind] ?? w.kind}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{STATE_LABELS[w.canonState] ?? w.canonState}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(w.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
