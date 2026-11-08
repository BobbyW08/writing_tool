// One-time migration runner: applies all pending Drizzle migrations to APP_DATABASE_URL.
// Run with: npx tsx --env-file=.env.local db/migrate.ts
// Safe to re-run: already-applied migrations are skipped.

import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'
import { resolve } from 'path'

async function main() {
  const sql = neon(process.env.APP_DATABASE_URL!)
  const db = drizzle(sql)
  await migrate(db, { migrationsFolder: resolve(process.cwd(), 'db', 'migrations') })
  console.log('Migrations applied.')
}

main().catch((e) => { console.error(e); process.exit(1) })
