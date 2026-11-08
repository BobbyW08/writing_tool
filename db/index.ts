// New app database connection. Uses APP_DATABASE_URL (never DATABASE_URL or PAYLOAD_DATABASE_URL).
// Exported as `appDb` to avoid any risk of collision with the old `db` export in lib/db/index.ts.

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

const sql = neon(process.env.APP_DATABASE_URL!)
export const appDb = drizzle(sql, { schema })

export type AppDb = typeof appDb
