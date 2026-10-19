import type { CollectionBeforeDeleteHook, CollectionConfig, Payload } from 'payload'
import { APIError } from 'payload'
import { assignCode, codeField } from '../fields/code'
import { TAG_PREFIX, UNK_TAG } from '../lib/codes'

// UNK is built in and cannot be deleted. Tags you create yourself can be.
const protectUnk: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const doc = (await req.payload.findByID({ collection: 'tags', id, depth: 0, req })) as { name?: string } | null
  if (doc?.name === UNK_TAG) throw new APIError('UNK is a built-in tag and cannot be deleted.', 400)
}

export const Tags: CollectionConfig = {
  slug: 'tags',
  labels: { singular: 'Tag', plural: 'Tags' },
  admin: { group: 'System', useAsTitle: 'name', defaultColumns: ['code', 'name', 'description'] },
  defaultSort: 'name',
  hooks: { beforeValidate: [assignCode(TAG_PREFIX)], beforeDelete: [protectUnk] },
  fields: [
    codeField,
    { name: 'name', type: 'text', required: true, unique: true },
    { name: 'description', type: 'textarea' },
  ],
}

// Makes sure the UNK tag exists. Runs when Payload starts.
export async function ensureUnkTag(payload: Payload) {
  const found = await payload.find({ collection: 'tags', where: { name: { equals: UNK_TAG } }, limit: 1, depth: 0 })
  if (found.docs.length) return
  await payload.create({
    collection: 'tags',
    data: {
      name: UNK_TAG,
      description:
        'Unverified. A best guess was filled in (by Claude or by an import) and needs your double check. Remove this tag once you confirm.',
    },
  })
}
