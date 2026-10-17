import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { assignCode, codeField } from '../fields/code'
import { reviewNoteField, tagsField } from '../fields/tags'
import { ENTITY_SLUGS, RELATIONSHIP_PREFIX } from '../lib/codes'
import { RELATIONSHIP_TYPES } from '../lib/relationshipTypes'

type Ref = { relationTo: string; value: number | string | { id: number | string; code?: string } }

async function codeOf(ref: Ref | undefined, req: Parameters<CollectionBeforeChangeHook>[0]['req']) {
  if (!ref) return ''
  if (typeof ref.value === 'object' && ref.value?.code) return ref.value.code
  const id = typeof ref.value === 'object' ? ref.value.id : ref.value
  const doc = (await req.payload.findByID({
    collection: ref.relationTo as never,
    id,
    depth: 0,
    req,
  })) as { code?: string } | null
  return doc?.code ?? ''
}

// Builds a readable title like "C10 Parent of C12" so the list view is easy to scan.
const buildTitle: CollectionBeforeChangeHook = async ({ data, req }) => {
  const label = RELATIONSHIP_TYPES.find((t) => t.value === data.type)?.label ?? data.type
  const [from, to] = await Promise.all([codeOf(data.from, req), codeOf(data.to, req)])
  return { ...data, fromCode: from, toCode: to, title: `${from} ${label} ${to}`.trim() }
}

// One record per link. The reverse side is found by searching both ends, so nothing is entered twice.
export const Relationships: CollectionConfig = {
  slug: 'relationships',
  labels: { singular: 'Relationship', plural: 'Relationships' },
  admin: {
    group: 'Story',
    useAsTitle: 'title',
    defaultColumns: ['code', 'title', 'startYear', 'endYear'],
    listSearchableFields: ['code', 'title', 'fromCode', 'toCode'],
  },
  defaultSort: 'code',
  hooks: {
    beforeValidate: [assignCode(RELATIONSHIP_PREFIX)],
    beforeChange: [buildTitle],
  },
  fields: [
    codeField,
    { name: 'title', type: 'text', admin: { readOnly: true } },
    {
      type: 'row',
      fields: [
        { name: 'from', type: 'relationship', relationTo: ENTITY_SLUGS, required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          defaultValue: 'related_to',
          options: RELATIONSHIP_TYPES.map((t) => ({ label: `${t.group}: ${t.label}`, value: t.value })),
        },
        { name: 'to', type: 'relationship', relationTo: ENTITY_SLUGS, required: true },
      ],
    },
    { name: 'fromCode', type: 'text', index: true, admin: { readOnly: true, hidden: true } },
    { name: 'toCode', type: 'text', index: true, admin: { readOnly: true, hidden: true } },
    {
      type: 'row',
      fields: [
        { name: 'startYear', type: 'number', admin: { description: 'When this started (year 0 = SERO born). Optional.' } },
        { name: 'endYear', type: 'number', admin: { description: 'When it ended. Leave empty if ongoing.' } },
      ],
    },
    { name: 'notes', type: 'richText' },
    tagsField,
    reviewNoteField,
  ],
}
