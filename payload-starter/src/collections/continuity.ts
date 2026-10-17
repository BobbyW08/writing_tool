import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'
import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import { assignCode, codeField } from '../fields/code'
import { FLAG_PREFIX, WORLD_SLUGS } from '../lib/codes'
import { Writing } from './entities'

// Keeps a plain text copy of each piece of writing. The continuity check quotes the author's own
// words and verifies every quote against this text, so it needs plain text, not editor JSON.
export const syncPlainText: CollectionBeforeChangeHook = ({ data }) => {
  if (data?.text) {
    return { ...data, plainText: convertLexicalToPlaintext({ data: data.text }) }
  }
  return data
}

Writing.hooks = {
  ...Writing.hooks,
  beforeChange: [...(Writing.hooks?.beforeChange ?? []), syncPlainText],
}

const entityRef = { relationTo: [...WORLD_SLUGS] }

const options = (values: string[]) => values.map((v) => ({ label: v.replace(/_/g, ' '), value: v }))

// One finding that needs a decision, or a notice about a change already applied.
// Conflicts never touch canon until a decision is made.
export const ContinuityFlags: CollectionConfig = {
  slug: 'continuity-flags',
  labels: { singular: 'Continuity item', plural: 'Continuity inbox' },
  admin: {
    group: 'Continuity',
    useAsTitle: 'code',
    defaultColumns: ['code', 'kind', 'fieldLabel', 'status', 'createdAt'],
  },
  defaultSort: '-createdAt',
  hooks: { beforeValidate: [assignCode(FLAG_PREFIX)] },
  fields: [
    codeField,
    { name: 'snippet', type: 'relationship', relationTo: 'writing', required: true },
    { name: 'entity', type: 'relationship', ...entityRef, required: true },
    { name: 'kind', type: 'select', required: true, options: options(['conflict', 'possible_change', 'new_record', 'new_detail']) },
    { name: 'fieldLabel', type: 'text', required: true },
    { name: 'existingExcerpt', type: 'textarea', admin: { description: 'Exact words from canon.' } },
    { name: 'newQuote', type: 'textarea', required: true, admin: { description: 'Exact words from the writing.' } },
    { name: 'explanation', type: 'textarea' },
    { name: 'status', type: 'select', defaultValue: 'open', options: options(['open', 'resolved']) },
    {
      name: 'choice',
      type: 'select',
      options: options(['keep_canon', 'update_canon', 'both_true', 'changed_over_time', 'decide_later', 'acknowledged', 'undone']),
    },
    { name: 'reason', type: 'textarea' },
    { name: 'context', type: 'textarea' },
    { name: 'resolvedAt', type: 'date' },
  ],
}

// Every change a snippet or a decision made to an entry field: where each canon fact came from.
export const FieldHistory: CollectionConfig = {
  slug: 'field-history',
  labels: { singular: 'Field history', plural: 'Field history' },
  admin: { group: 'Continuity', defaultColumns: ['fieldLabel', 'action', 'createdAt'] },
  defaultSort: '-createdAt',
  fields: [
    { name: 'entity', type: 'relationship', ...entityRef, required: true },
    { name: 'fieldLabel', type: 'text', required: true },
    { name: 'action', type: 'select', required: true, options: options(['created', 'added', 'updated', 'both_true', 'changed_over_time', 'undone']) },
    { name: 'oldValue', type: 'textarea' },
    { name: 'newValue', type: 'textarea' },
    { name: 'snippet', type: 'relationship', relationTo: 'writing' },
    { name: 'flag', type: 'relationship', relationTo: 'continuity-flags' },
  ],
}

// A detail in a piece of writing that already matches canon. Logged quietly, no notification.
export const SnippetConfirmations: CollectionConfig = {
  slug: 'snippet-confirmations',
  labels: { singular: 'Confirmation', plural: 'Confirmations' },
  admin: { group: 'Continuity', defaultColumns: ['fieldLabel', 'quote', 'createdAt'] },
  defaultSort: '-createdAt',
  fields: [
    { name: 'snippet', type: 'relationship', relationTo: 'writing', required: true },
    { name: 'entity', type: 'relationship', ...entityRef, required: true },
    { name: 'fieldLabel', type: 'text', required: true },
    { name: 'quote', type: 'textarea', required: true },
  ],
}
