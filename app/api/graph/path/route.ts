import { NextRequest, NextResponse } from 'next/server'
import { getShortestPath } from '@/lib/graph/queries'

// GET /api/graph/path?from=C1&to=C20 — the shortest chain of connections between two records.
export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from')?.toUpperCase()
  const to = req.nextUrl.searchParams.get('to')?.toUpperCase()
  if (!from || !to) {
    return NextResponse.json({ error: 'from and to are required' }, { status: 400 })
  }

  const path = await getShortestPath(from, to)
  if (path === null) return NextResponse.json({ from, to, path: null, found: false })
  return NextResponse.json({ from, to, path, found: true })
}
