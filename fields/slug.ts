import type { CollectionBeforeValidateHook, Field } from 'payload'
import { slugify } from '../lib/codes'

// A readable, stable key used in URLs and for resolving the old [[Type#Name|Label]] links.
// Set once on create and left alone afterward, so renaming an entry never breaks a link.
export const slugField: Field = {
  name: 'slug',
  type: 'text',
  unique: true,
  index: true,
  admin: { position: 'sidebar', description: 'Set automatically from the name. Stays the same if you rename.' },
}

export const ensureSlug =
  (titleField: string): CollectionBeforeValidateHook =>
  async ({ data, operation, originalDoc, collection, req }) => {
    if (operation === 'update') return { ...data, slug: originalDoc?.slug ?? data?.slug }
    if (operation !== 'create' || data?.slug) return data

    const base = slugify(String(data?.[titleField] ?? '')) || 'untitled'
    const clash = await req.payload.find({
      collection: collection.slug as never,
      where: { slug: { equals: base } },
      limit: 1,
      depth: 0,
      req,
    })
    const suffix = typeof data?.code === 'string' ? data.code.toLowerCase() : String(Date.now())
    return { ...data, slug: clash.docs.length ? `${base}-${suffix}` : base }
  }
