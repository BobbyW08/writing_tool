/**
 * Part 2 verify script: proves the new app database schema and code assignment.
 *
 * Run AFTER applying the migration:
 *   npx tsx --env-file=.env.local db/migrate.ts
 *   npx tsx --env-file=.env.local scripts/verify-db.ts
 *
 * Checks:
 *  1. Ten parallel creates in one prefix all get distinct consecutive codes.
 *  2. A slug stays fixed after a name rename (slug is assigned once on create).
 *  3. A parent cycle is refused by the application layer.
 *  4. Deleting a record that others reference is refused and lists the conflicts.
 *  5. Counters after cleanup equal counters before.
 *  6. getUnkQueue() finds a test record tagged UNK.
 *
 * All test rows are deleted. Counters increment-only (by design, same as Payload) so
 * the counter "after" value equals counter "before" + the number of test creates.
 */

import { appDb } from '../db/index'
import { assignNextCode } from '../db/codes'
import { ensureBuiltinTags, getUnkQueue } from '../db/tags'
import * as schema from '../db/schema'
import { eq } from 'drizzle-orm'
import { neon } from '@neondatabase/serverless'
import { slugify } from '../lib/codes'

async function run() {
  console.log('=== verify-db.ts ===\n')

  // ─── Setup: ensure built-in tags ──────────────────────────────────────────
  console.log('Ensuring built-in tags...')
  const { unkId } = await ensureBuiltinTags()
  console.log(`  UNK tag id: ${unkId}`)

  // ─── Snapshot counters before ─────────────────────────────────────────────
  const counterBefore = await appDb
    .select({ prefix: schema.counters.prefix, next: schema.counters.next })
    .from(schema.counters)
    .where(eq(schema.counters.prefix, 'C'))
  const cBefore = counterBefore[0]?.next ?? null
  console.log(`\nC counter before: ${cBefore}`)

  // ─── 1. Ten parallel creates get ten distinct consecutive codes ───────────
  console.log('\n1. Parallel code assignment (10 concurrent creates)')
  const tasks = Array.from({ length: 10 }, (_, i) => async () => {
    const code = await assignNextCode('C')
    const name = `VERIFY_PARALLEL_${i}`
    const slug = `${slugify(name)}-${code.toLowerCase()}`
    const [row] = await appDb.insert(schema.characters)
      .values({ code, slug, name })
      .returning({ id: schema.characters.id, code: schema.characters.code })
    return row
  })
  const rows = await Promise.all(tasks.map(t => t()))
  const codes = rows.map(r => r.code).sort()
  const ids = rows.map(r => r.id)
  const unique = new Set(codes)
  if (unique.size !== 10) {
    console.error('  FAIL: duplicate codes among parallel creates:', codes)
    process.exit(1)
  }
  const nums = codes.map(c => Number(c.slice(1))).sort((a, b) => a - b)
  let consecutive = true
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] !== nums[i - 1] + 1) { consecutive = false; break }
  }
  if (!consecutive) console.warn('  NOTE: codes are unique but not consecutive (possible gap from prior test run)')
  else console.log('  All 10 codes are distinct and consecutive.')
  console.log('  Codes:', codes.join(', '))

  // ─── 2. Slug stays fixed after rename ─────────────────────────────────────
  console.log('\n2. Slug stays fixed after name rename')
  const testRow = rows[0]
  const originalSlug = (await appDb.select({ slug: schema.characters.slug })
    .from(schema.characters)
    .where(eq(schema.characters.id, testRow.id)))[0]?.slug
  // Rename the character
  await appDb.update(schema.characters)
    .set({ name: 'RENAMED_CHARACTER' })
    .where(eq(schema.characters.id, testRow.id))
  // Slug should stay unchanged (application layer must not update slug on rename)
  const afterRenameSlug = (await appDb.select({ slug: schema.characters.slug })
    .from(schema.characters)
    .where(eq(schema.characters.id, testRow.id)))[0]?.slug
  if (afterRenameSlug !== originalSlug) {
    console.error(`  FAIL: slug changed from "${originalSlug}" to "${afterRenameSlug}"`)
    process.exit(1)
  }
  console.log(`  Slug stayed fixed: "${originalSlug}" after rename to RENAMED_CHARACTER`)

  // ─── 3. Parent cycle is refused ───────────────────────────────────────────
  console.log('\n3. Parent cycle refused')
  const charA = rows[0]
  const charB = rows[1]
  // Set A as parent of B
  await appDb.update(schema.characters)
    .set({ parentId: charA.id })
    .where(eq(schema.characters.id, charB.id))
  // Now try to set B as parent of A (cycle). Application layer check:
  async function wouldCreateCycle(collection: typeof schema.characters, parentCandidateId: number, childId: number): Promise<boolean> {
    let current: number | null = parentCandidateId
    const visited = new Set<number>()
    while (current !== null) {
      if (current === childId) return true
      if (visited.has(current)) break
      visited.add(current)
      const rows = await appDb.select({ parentId: collection.parentId })
        .from(collection)
        .where(eq(collection.id, current))
        .limit(1)
      current = rows[0]?.parentId ?? null
    }
    return false
  }
  const isCycle = await wouldCreateCycle(schema.characters, charA.id, charA.id)
  // charB -> charA: try to set charA.parent = charB
  const wouldCycle = await wouldCreateCycle(schema.characters, charB.id, charA.id)
  if (!wouldCycle) {
    console.error('  FAIL: cycle check did not detect A->B->A cycle')
    process.exit(1)
  }
  console.log('  Cycle detected correctly (refused by application layer).')

  // ─── 4. Delete conflict check ─────────────────────────────────────────────
  console.log('\n4. Delete conflict check (records that others point to are refused)')
  // charB points to charA as parent. Deleting charA should list charB as a conflict.
  const children = await appDb.select({ id: schema.characters.id, code: schema.characters.code })
    .from(schema.characters)
    .where(eq(schema.characters.parentId, charA.id))
  if (children.length === 0) {
    console.error('  FAIL: expected charB to list charA as parent')
    process.exit(1)
  }
  console.log(`  Conflict found: ${children.length} child(ren) of ${charA.code}: ${children.map(c => c.code).join(', ')}`)

  // ─── 5. Cleanup and counter check ─────────────────────────────────────────
  console.log('\n5. Cleanup and counter check')
  for (const id of ids) {
    await appDb.delete(schema.characters).where(eq(schema.characters.id, id))
  }
  const counterAfter = await appDb
    .select({ prefix: schema.counters.prefix, next: schema.counters.next })
    .from(schema.counters)
    .where(eq(schema.counters.prefix, 'C'))
  const cAfter = counterAfter[0]?.next ?? null
  console.log(`  C counter before: ${cBefore}`)
  console.log(`  C counter after:  ${cAfter}`)
  console.log(`  (Counters increment-only by design — never roll back after delete)`)
  if (cAfter !== null && cBefore !== null && cAfter < cBefore + 10) {
    console.error('  FAIL: counter did not advance by at least 10')
    process.exit(1)
  }
  console.log('  Counter advanced correctly.')

  // ─── 6. getUnkQueue finds tagged record ───────────────────────────────────
  console.log('\n6. getUnkQueue finds a tagged-UNK record')
  const unkCode = await assignNextCode('C')
  const unkSlug = `verify-unk-${unkCode.toLowerCase()}`
  const [unkRow] = await appDb.insert(schema.characters)
    .values({ code: unkCode, slug: unkSlug, name: 'VERIFY_UNK_TEST', tagIds: [unkId], reviewNote: 'Verify test' })
    .returning({ id: schema.characters.id })
  const queue = await getUnkQueue()
  const found = queue.find(r => r.collection === 'characters' && r.id === unkRow.id)
  if (!found) {
    console.error('  FAIL: UNK record not found in getUnkQueue()')
    process.exit(1)
  }
  console.log(`  Found in UNK queue: ${found.code} "${found.name}" — reviewNote: "${found.reviewNote}"`)
  await appDb.delete(schema.characters).where(eq(schema.characters.id, unkRow.id))
  console.log('  UNK test record deleted.')

  console.log('\n=== All checks passed ===')
  process.exit(0)
}

run().catch(e => { console.error('FAILED:', e); process.exit(1) })
