import type { Field } from 'payload'

// Added to every entry, relationship and piece of writing, so any record can carry tags.
export const tagsField: Field = {
  name: 'tags',
  type: 'relationship',
  relationTo: 'tags',
  hasMany: true,
  label: 'Tags',
  admin: {
    position: 'sidebar',
    description: 'UNK means a best guess was filled in and needs your double check. Remove it once you confirm.',
  },
}

// Always visible. When something is tagged UNK, this says exactly what to check.
export const reviewNoteField: Field = {
  name: 'reviewNote',
  type: 'textarea',
  label: 'Check this',
  admin: { description: 'Why this was tagged UNK and what to double check. Blank when nothing is outstanding.' },
}
