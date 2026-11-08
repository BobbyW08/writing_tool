import { NextRequest, NextResponse } from 'next/server'
import { createReadStream, existsSync, statSync } from 'fs'
import { extname } from 'path'
import { getUploadPath } from '@/lib/media/storage'

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params
  const filename = path.join('/')
  if (filename.includes('..')) return new NextResponse('Forbidden', { status: 403 })

  const filePath = await getUploadPath(filename)
  if (!existsSync(filePath)) return new NextResponse('Not found', { status: 404 })

  const stat = statSync(filePath)
  const ext = extname(filename).toLowerCase()
  const contentType = MIME_MAP[ext] ?? 'application/octet-stream'

  const stream = createReadStream(filePath)
  const nodeStream = stream as unknown as ReadableStream
  return new NextResponse(nodeStream, {
    headers: {
      'Content-Type': contentType,
      'Content-Length': stat.size.toString(),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
