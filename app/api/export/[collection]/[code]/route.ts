import { NextRequest, NextResponse } from 'next/server'
import { buildEntryMarkdown } from '@/lib/export/markdown'

// GET /api/export/:collection/:code -- "Export as Markdown" for any entry or event (Phase 7).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ collection: string; code: string }> }) {
  const { collection, code } = await params
  const md = await buildEntryMarkdown(collection, code.toUpperCase())
  if (!md) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${code.toUpperCase()}.md"`,
    },
  })
}
