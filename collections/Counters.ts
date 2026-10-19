import type { CollectionConfig } from 'payload'

// Hidden bookkeeping: remembers the next number for each prefix so IDs are never reused.
export const Counters: CollectionConfig = {
  slug: 'counters',
  admin: { hidden: true, group: 'System' },
  access: {
    create: ({ req }) => Boolean(req.user),
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: () => false,
  },
  fields: [
    { name: 'prefix', type: 'text', required: true, unique: true },
    { name: 'next', type: 'number', required: true, defaultValue: 1 },
  ],
}
