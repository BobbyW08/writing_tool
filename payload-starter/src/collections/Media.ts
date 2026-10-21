import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

// No code prefix. Stores uploaded images for portraits, crests, map bases, era backgrounds, etc.
export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Media', plural: 'Media' },
  admin: { group: 'System', defaultColumns: ['alt', 'kind', 'updatedAt'] },
  upload: {
    // Local disk storage in a git-ignored folder. Swap for cloud storage before deploy.
    staticDir: path.resolve(dirname, '../public/media'),
    adminThumbnail: 'thumbnail',
    imageSizes: [
      { name: 'thumbnail', width: 120, height: 120, position: 'centre' },
      { name: 'card', width: 400, height: 300, position: 'centre' },
    ],
    mimeTypes: ['image/*'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      label: 'Alt text',
    },
    {
      name: 'kind',
      type: 'select',
      label: 'Kind',
      options: [
        { label: 'Portrait', value: 'portrait' },
        { label: 'Crest / emblem', value: 'crest' },
        { label: 'Header', value: 'header' },
        { label: 'Map base', value: 'map_base' },
        { label: 'Map layer', value: 'map_layer' },
        { label: 'Era background', value: 'era_background' },
        { label: 'Board image', value: 'board_image' },
        { label: 'Other', value: 'other' },
      ],
      defaultValue: 'other',
    },
  ],
}
