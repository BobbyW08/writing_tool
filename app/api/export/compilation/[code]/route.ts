import { NextRequest, NextResponse } from 'next/server'
import { getCompilationByCode } from '@/lib/world/queries'
import { buildCompilationMarkdown } from '@/lib/export/markdown'

// GET /api/export/compilation/:code -- "Export compilation" (Phase 7): joins every item's own
// Markdown export, in the compilation's saved order, into one file.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const compilation = await getCompilationByCode(code)
  if (!compilation) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const md = await buildCompilationMarkdown(compilation.name, compilation.items)
  return new NextResponse(md, {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Content-Disposition': `attachment; filename="${compilation.code}.md"`,
    },
  })
}
