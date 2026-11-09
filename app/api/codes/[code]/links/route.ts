import { NextRequest, NextResponse } from 'next/server'
import { getLinksForCode } from '@/lib/graph/queries'

// GET /api/codes/:code/links — every connection touching a record, both directions, with the
// label and inverse label, grouped by source and type.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const entries = await getLinksForCode(code.toUpperCase())

  const grouped: Record<string, Record<string, typeof entries>> = {}
  for (const entry of entries) {
    grouped[entry.edge.source] ??= {}
    grouped[entry.edge.source][entry.edge.type] ??= []
    grouped[entry.edge.source][entry.edge.type].push(entry)
  }

  return NextResponse.json({ code: code.toUpperCase(), grouped, total: entries.length })
}
