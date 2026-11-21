import { inArray } from 'drizzle-orm'
import { PREFIX_TO_SLUG } from '@/lib/codes'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'

// Old code to current code, for every code in the list that was retired by a move. A code that was
// never moved is not in the result. Moves always repoint earlier history rows, so one hop is enough.
export async function currentCodes(codes: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const unique = [...new Set(codes.map((c) => c.toUpperCase()))]
  if (unique.length === 0) return out
  const rows = await appDb
    .select({ oldCode: schema.codeHistory.oldCode, newCode: schema.codeHistory.newCode })
    .from(schema.codeHistory)
    .where(inArray(schema.codeHistory.oldCode, unique))
  for (const r of rows) out.set(r.oldCode, r.newCode)
  return out
}

// Where an old code lives now, as a page path, or null if the code was never moved.
export async function movedTo(code: string): Promise<string | null> {
  const next = (await currentCodes([code])).get(code.toUpperCase())
  if (!next) return null
  const collection = PREFIX_TO_SLUG[next[0]]
  return collection ? `/${collection}/${next}` : null
}
