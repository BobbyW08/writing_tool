import type { CollectionConfig } from 'payload'

// Payload needs one user to exist. With autoLogin on locally you never see the login screen.
export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: { useAsTitle: 'email' },
  fields: [],
}
