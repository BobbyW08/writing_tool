'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { InfoboxFieldDef } from '@/lib/infobox'
import { updateFieldAction } from '@/lib/world/actions'

interface InlineDetail {
  label: string
  value: string
}

interface ImageInfo {
  id: number
  url?: string
  alt?: string
  filename?: string
}

interface InfoboxProps {
  collection: string
  docId: number
  image?: ImageInfo | null
  fixedFields: { def: InfoboxFieldDef; value: unknown }[]
  infoboxDetails: InlineDetail[]
}

export function Infobox({ collection, docId, image, fixedFields, infoboxDetails }: InfoboxProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [currentImage, setCurrentImage] = useState(image)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const displayFields = fixedFields.filter(f => f.value != null && f.value !== '')

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('alt', file.name.replace(/\.[^.]+$/, ''))
      formData.append('kind', 'portrait')

      const res = await fetch('/api/media', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || 'Upload failed')
      }
      const media = await res.json() as { id: number; url?: string; filename?: string; alt?: string }

      // Attach to record
      const result = await updateFieldAction(collection, docId, 'image', media.id)
      if (!result.ok) throw new Error(result.error ?? 'Failed to attach image')
      setCurrentImage({ id: media.id, url: media.url, alt: media.alt, filename: media.filename })
      router.refresh()
    } catch (err) {
      setUploadError(String(err))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleRemove() {
    const result = await updateFieldAction(collection, docId, 'image', null)
    if (result.ok) {
      setCurrentImage(null)
      router.refresh()
    }
  }

  return (
    <aside className="float-right ml-6 mb-4 w-56 rounded-md border bg-card shadow-sm">
      {/* Image slot */}
      <div className="relative">
        {currentImage?.url ? (
          <img
            src={currentImage.url}
            alt={currentImage.alt ?? ''}
            className="w-full rounded-t-md object-cover"
            style={{ maxHeight: 200 }}
          />
        ) : (
          <div className="flex h-36 items-center justify-center rounded-t-md bg-muted text-xs text-muted-foreground">
            No image
          </div>
        )}
        <div className="absolute bottom-1 right-1 flex gap-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded bg-background/80 px-1.5 py-0.5 text-xs hover:bg-background disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : currentImage ? 'Replace' : 'Upload'}
          </button>
          {currentImage && (
            <button
              type="button"
              onClick={handleRemove}
              className="rounded bg-background/80 px-1.5 py-0.5 text-xs hover:bg-destructive/80 hover:text-destructive-foreground"
            >
              Remove
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>

      {uploadError && (
        <p className="px-3 py-1 text-xs text-destructive">{uploadError}</p>
      )}

      {/* Fixed fields */}
      {(displayFields.length > 0 || infoboxDetails.length > 0) && (
        <table className="w-full text-xs">
          <tbody>
            {displayFields.map(({ def, value }) => (
              <tr key={def.field} className="border-t">
                <td className="py-1 pl-3 pr-1 font-semibold text-muted-foreground">{def.label}</td>
                <td className="py-1 pr-3 text-right">
                  {typeof value === 'object' && value !== null
                    ? (value as { name?: string; title?: string }).name ?? (value as { title?: string }).title ?? String(value)
                    : String(value)}
                </td>
              </tr>
            ))}
            {infoboxDetails.map((d, i) => (
              <tr key={i} className="border-t">
                <td className="py-1 pl-3 pr-1 font-semibold text-muted-foreground">{d.label}</td>
                <td className="py-1 pr-3 text-right">{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </aside>
  )
}
