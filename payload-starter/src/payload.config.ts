import path from 'path'
import { fileURLToPath } from 'url'
import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'

import { Users } from './collections/Users'
import { Counters } from './collections/Counters'
import { Relationships } from './collections/Relationships'
import { Tags, ensureUnkTag } from './collections/Tags'
import { entityCollections } from './collections/entities'
import { ContinuityFlags, FieldHistory, SnippetConfirmations } from './collections/continuity'
import { codeEndpoints } from './endpoints/codes'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = process.env.NODE_ENV === 'development'

export default buildConfig({
  admin: {
    user: Users.slug,
    // Local development only: signs you straight in, no login screen.
    // A deployed copy keeps a real single-user login.
    autoLogin: isDev
      ? { email: 'me@traveler.local', password: process.env.DEV_PASSWORD || 'dev-only-password' }
      : false,
  },
  collections: [
    Users,
    Counters,
    Tags,
    ...entityCollections,
    Relationships,
    ContinuityFlags,
    FieldHistory,
    SnippetConfirmations,
  ],
  endpoints: codeEndpoints,
  onInit: async (payload) => {
    await ensureUnkTag(payload)
  },
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  // Payload gets its own database. It manages every table in the schema it connects to.
  db: postgresAdapter({ pool: { connectionString: process.env.PAYLOAD_DATABASE_URL || '' } }),
  typescript: { outputFile: path.resolve(dirname, 'payload-types.ts') },
})
