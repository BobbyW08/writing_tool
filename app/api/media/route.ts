import { NextRequest, NextResponse } from 'next/server'
import { saveUpload } from '@/lib/media/storage'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const alt = (formData.get('alt') as string | null) ?? ''

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await saveUpload(buffer, file.name, file.type || 'application/octet-stream', alt)

    return NextResponse.json({
      id: result.id,
      url: result.url,
      filename: result.filename,
      alt: result.alt,
      width: result.width,
      height: result.height,
    })
  } catch (err) {
    console.error('[POST /api/media]', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
