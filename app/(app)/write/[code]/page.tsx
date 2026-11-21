import { notFound } from 'next/navigation'
import { getWritingByCode, getStoryList } from '@/lib/studio/queries'
import { getCheckSummary, listHistoryForWriting } from '@/lib/continuity/queries'
import { buildCodeMap } from '@/lib/world/queries'
import { WritingEditor } from './editor'

export default async function WritingEditorPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const [record, stories] = await Promise.all([
    getWritingByCode(code.toUpperCase()),
    getStoryList(),
  ])

  if (!record) notFound()

  const [summary, codeMap, history] = await Promise.all([
    getCheckSummary(record.id),
    buildCodeMap([record.text]),
    listHistoryForWriting(record.id),
  ])

  return <WritingEditor record={record} stories={stories} summary={summary} codeMap={codeMap} history={history} />
}
