import { NextRequest, NextResponse } from 'next/server'
import { getRelationshipByCode } from '@/lib/world/queries'

// GET /api/relationships/:code — a relationship's full editable fields, by its own X-code. Used
// by the node map and relationship view's edge editor (step U5), which only have the edge's
// relationshipCode (lib/graph/types.ts) to start from.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const rel = await getRelationshipByCode(code)
  if (!rel) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(rel)
}
