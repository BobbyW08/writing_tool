import { notFound } from 'next/navigation'
import { getWritingByCode, getStoryList } from '@/lib/studio/queries'
import { getCheckSummary } from '@/lib/continuity/queries'
import { WritingEditor } from './editor'

export default async function WritingEditorPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const [record, stories] = await Promise.all([
    getWritingByCode(code.toUpperCase()),
    getStoryList(),
  ])

  if (!record) notFound()

  const summary = await getCheckSummary(record.id)

  return <WritingEditor record={record} stories={stories} summary={summary} />
}
