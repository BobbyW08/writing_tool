import { NextRequest, NextResponse } from 'next/server'
import { getFilteredGraph } from '@/lib/graph/queries'

// GET /api/graph?collections=&tags=&yearFrom=&yearTo= — a whole or filtered graph.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const collections = sp.get('collections')?.split(',').filter(Boolean)
  const tags = sp.get('tags')?.split(',').filter(Boolean)
  const yearFromRaw = sp.get('yearFrom')
  const yearToRaw = sp.get('yearTo')

  const graph = await getFilteredGraph({
    collections,
    tags,
    yearFrom: yearFromRaw ? Number(yearFromRaw) : undefined,
    yearTo: yearToRaw ? Number(yearToRaw) : undefined,
  })

  return NextResponse.json(graph)
}
