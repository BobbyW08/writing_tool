import { NextRequest, NextResponse } from 'next/server'
import { getGraphFromCode } from '@/lib/graph/queries'

// GET /api/graph/:code?depth=2&direction=both&sources=&types=&collections=
// Nodes and edges outward from one record, breadth first, capped at 300 nodes.
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const sp = req.nextUrl.searchParams

  const depthRaw = sp.get('depth')
  const depth = depthRaw ? Number(depthRaw) : undefined
  const direction = sp.get('direction') as 'both' | 'out' | 'in' | null
  const sources = sp.get('sources')?.split(',').filter(Boolean)
  const types = sp.get('types')?.split(',').filter(Boolean)
  const collections = sp.get('collections')?.split(',').filter(Boolean)

  const graph = await getGraphFromCode(code.toUpperCase(), {
    depth: depth !== undefined && !Number.isNaN(depth) ? depth : undefined,
    direction: direction ?? undefined,
    sources, types, collections,
  })

  return NextResponse.json(graph)
}
