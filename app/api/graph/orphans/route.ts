import { NextResponse } from 'next/server'
import { getOrphanCodes } from '@/lib/graph/queries'

// GET /api/graph/orphans — records with no connections.
export async function GET() {
  const orphans = await getOrphanCodes()
  return NextResponse.json({ orphans, total: orphans.length })
}
