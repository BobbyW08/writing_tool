import { NextResponse } from 'next/server'
import { getBrokenLinks } from '@/lib/graph/queries'

// GET /api/graph/broken — connections whose target was deleted.
export async function GET() {
  const broken = await getBrokenLinks()
  return NextResponse.json({ broken, total: broken.length })
}
