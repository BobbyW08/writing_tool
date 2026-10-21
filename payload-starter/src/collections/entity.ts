import type { CollectionConfig, Field } from 'payload'
import { assignCode, codeField } from '../fields/code'
import { ensureSlug, slugField } from '../fields/slug'
import { reviewNoteField, tagsField } from '../fields/tags'
import { imageField } from '../fields/image'
import { ENTITY_PREFIXES, type EntitySlug } from '../lib/codes'

// The same four status values the existing app uses, so nothing is lost in the migration.
export const STATUS_OPTIONS = [
  { label: 'Locked (canon)', value: 'locked' },
  { label: 'In development', value: 'in_development' },
  { label: 'Needs a name', value: 'needs_name' },
  { label: 'Placeholder (still to decide)', value: 'placeholder' },
]

const buildCommonFields = (slug: EntitySlug): Field[] => [
  codeField,
  slugField,
  { name: 'name', type: 'text', required: true },
  {
    name: 'aliases',
    type: 'array',
    label: 'Also known as',
    fields: [{ name: 'alias', type: 'text', required: true }],
  },
  { name: 'summary', type: 'textarea', admin: { description: 'One or two lines. Shown in lists and maps.' } },
  {
    name: 'status',
    type: 'select',
    defaultValue: 'in_development',
    options: STATUS_OPTIONS,
    admin: { position: 'sidebar' },
  },
  {
    name: 'gapPrompt',
    type: 'textarea',
    label: 'Gap prompt',
    admin: { description: 'What still needs deciding. Always shown, blank when there is nothing outstanding.' },
  },
  imageField,
  // Free-form labeled fields, exactly like the old app: "Origin", "Personality", "Appearance"...
  {
    name: 'details',
    type: 'array',
    label: 'Details',
    labels: { singular: 'Detail', plural: 'Details' },
    admin: { description: 'Any labeled fact about this entry. The continuity check reads these.' },
    fields: [
      { name: 'label', type: 'text', required: true },
      { name: 'value', type: 'textarea' },
      {
        name: 'inInfobox',
        type: 'checkbox',
        defaultValue: false,
        label: 'Show in infobox',
        admin: { description: 'Checked rows appear in the infobox at the top of the entry page.' },
      },
    ],
  },
  { name: 'body', type: 'richText', label: 'Notes' },
  tagsField,
  reviewNoteField,
  {
    name: 'parent',
    type: 'relationship',
    relationTo: slug,
    label: 'Part of',
    admin: { position: 'sidebar', description: 'Makes this a sub-item of another entry in the same collection.' },
  },
  {
    type: 'collapsible',
    label: 'Origin of this record',
    admin: { initCollapsed: true },
    fields: [
      { name: 'sourceDocId', type: 'text', admin: { readOnly: true } },
      { name: 'legacyId', type: 'text', index: true, admin: { readOnly: true, description: 'Row id in the old app, kept so a migration re-run updates instead of duplicating.' } },
    ],
  },
]

export function entityCollection(args: {
  slug: EntitySlug
  singular: string
  plural: string
  group: string
  titleField?: string
  fields?: Field[]
  omit?: string[]
}): CollectionConfig {
  const prefix = ENTITY_PREFIXES[args.slug]
  const titleField = args.titleField ?? 'name'
  const omit = new Set(args.omit ?? [])
  return {
    slug: args.slug,
    labels: { singular: args.singular, plural: args.plural },
    admin: {
      group: args.group,
      useAsTitle: titleField,
      defaultColumns: ['code', titleField, 'status', 'updatedAt'],
      listSearchableFields: ['code', titleField, 'summary'],
    },
    defaultSort: 'code',
    versions: { maxPerDoc: 25 },
    hooks: { beforeValidate: [assignCode(prefix), ensureSlug(titleField)] },
    fields: [
      ...buildCommonFields(args.slug).filter((f) => !('name' in f) || !omit.has(f.name as string)),
      ...(args.fields ?? []),
    ],
  }
}
