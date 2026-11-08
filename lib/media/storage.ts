import 'server-only'
import { createWriteStream, mkdirSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'

const UPLOADS_DIR = join(process.cwd(), 'uploads')

function ensureUploadsDir() {
  if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true })
}

export type SavedMedia = {
  id: number
  url: string
  filename: string
  alt: string
  width: number | null
  height: number | null
  filesize: number
  mimeType: string
}

export async function saveUpload(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string,
  alt: string,
): Promise<SavedMedia> {
  ensureUploadsDir()

  const ext = extname(originalFilename) || '.jpg'
  const base = randomUUID()
  const filename = `${base}${ext}`
  const thumbFilename = `${base}-thumbnail${ext}`

  const origPath = join(UPLOADS_DIR, filename)
  const thumbPath = join(UPLOADS_DIR, thumbFilename)

  let width: number | null = null
  let height: number | null = null
  let thumbWidth: number | null = null
  let thumbHeight: number | null = null

  // Write original
  await new Promise<void>((resolve, reject) => {
    const ws = createWriteStream(origPath)
    ws.on('finish', resolve)
    ws.on('error', reject)
    ws.end(buffer)
  })

  // Generate thumbnail with sharp if it's an image
  const sizes: Record<string, { url: string; width: number; height: number }> = {}
  if (mimeType.startsWith('image/')) {
    try {
      const sharp = (await import('sharp')).default
      const meta = await sharp(buffer).metadata()
      width = meta.width ?? null
      height = meta.height ?? null

      const thumbBuf = await sharp(buffer).resize({ width: 200, withoutEnlargement: true }).toBuffer({ resolveWithObject: true })
      thumbWidth = thumbBuf.info.width
      thumbHeight = thumbBuf.info.height

      await new Promise<void>((resolve, reject) => {
        const ws = createWriteStream(thumbPath)
        ws.on('finish', resolve)
        ws.on('error', reject)
        ws.end(thumbBuf.data)
      })

      sizes['thumbnail'] = { url: `/api/uploads/${thumbFilename}`, width: thumbWidth, height: thumbHeight }
    } catch {
      // Non-fatal: skip thumbnail on sharp error
    }
  }

  const url = `/api/uploads/${filename}`
  const [row] = await appDb.insert(schema.media).values({
    filename,
    mimeType,
    filesize: buffer.byteLength,
    width,
    height,
    alt,
    url,
    sizes: Object.keys(sizes).length > 0 ? sizes : {},
  }).returning({ id: schema.media.id })

  return {
    id: (row as { id: number }).id,
    url,
    filename,
    alt,
    width,
    height,
    filesize: buffer.byteLength,
    mimeType,
  }
}

export async function getUploadPath(filename: string): Promise<string> {
  return join(UPLOADS_DIR, filename)
}
