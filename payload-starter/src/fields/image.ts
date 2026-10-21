import type { Field } from 'payload'

// Shared image field: a relation to the media upload collection.
// Added to every world collection and to events (not to writing).
export const imageField: Field = {
  name: 'image',
  type: 'upload',
  relationTo: 'media',
  label: 'Image',
  admin: {
    position: 'sidebar',
    description: 'Portrait, crest or header. Shows in the infobox and on node cards.',
  },
}
