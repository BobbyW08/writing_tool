// Code assignment backed by the new app database.
// assignNextCode() is atomic: ten parallel creates in one prefix never get the same number.
// slugify() and PREFIX_TO_SLUG are re-exported from lib/codes so nothing needs two imports.

import { neon } from '@neondatabase/serverless'

export { slugify, PREFIX_TO_SLUG, CODE_REGEX, extractCodes, ENTITY_PREFIXES, ENTITY_SLUGS } from '@/lib/codes'

// Atomically claims the next number for a prefix and returns the full code string.
// Uses INSERT ... ON CONFLICT DO UPDATE so a single SQL round-trip handles both
// the first create (no row yet) and subsequent creates (increment row).
export async function assignNextCode(prefix: string, suppliedCode?: string): Promise<string> {
  const sql = neon(process.env.APP_DATABASE_URL!)

  if (suppliedCode) {
    // Import path: code was supplied (e.g. during copy-from-payload).
    // Keep it and push the counter past it so future creates do not collide.
    const m = new RegExp(`^${prefix}(\\d+)$`).exec(suppliedCode.trim().toUpperCase())
    if (m) {
      const num = Number(m[1])
      // Move counter to max(current_next, num+1)
      await sql`
        INSERT INTO counters (prefix, next)
        VALUES (${prefix}, ${num + 1})
        ON CONFLICT (prefix) DO UPDATE
          SET next = GREATEST(counters.next, ${num + 1})
      `
      return suppliedCode.trim().toUpperCase()
    }
  }

  // Normal create: atomically claim the next number.
  const rows = await sql`
    INSERT INTO counters (prefix, next)
    VALUES (${prefix}, 2)
    ON CONFLICT (prefix) DO UPDATE
      SET next = counters.next + 1
    RETURNING next - 1 AS assigned
  `
  const assigned = (rows[0] as { assigned: number }).assigned
  return `${prefix}${assigned}`
}

// New: also exported for the copy script which needs to reset counters after bulk import.
export async function setCounterMinimum(prefix: string, minimum: number): Promise<void> {
  const sql = neon(process.env.APP_DATABASE_URL!)
  await sql`
    INSERT INTO counters (prefix, next)
    VALUES (${prefix}, ${minimum})
    ON CONFLICT (prefix) DO UPDATE
      SET next = GREATEST(counters.next, ${minimum})
  `
}
