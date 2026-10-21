import { notFound } from 'next/navigation'
import { getWritingByCode, getStoryList } from '@/lib/studio/queries'
import { WritingEditor } from './editor'

export default async function WritingEditorPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const [record, stories] = await Promise.all([
    getWritingByCode(code.toUpperCase()),
    getStoryList(),
  ])

  if (!record) notFound()

  return <WritingEditor record={record} stories={stories} />
}
