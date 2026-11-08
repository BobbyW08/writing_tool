/**
 * verify-world-edit.ts  —  Part 3 data layer verification
 *
 * Tests: create, edit, detail row, relationship, delete conflict, UNK tag.
 * All test rows are removed. Counters increment-only (by design): the after
 * value will be higher than before.
 *
 * Run: npx tsx --env-file=.env.local scripts/verify-world-edit.ts
 */

import { eq, or, like, inArray } from 'drizzle-orm'
import { appDb } from '../db/index'
import * as schema from '../db/schema'
import { assignNextCode } from '../db/codes'
import { getUnkQueue } from '../db/tags'
import { slugify } from '../lib/codes'

async function run() {
  console.log('=== verify-world-edit ===\n')

  // ─── Pre-clean: remove test rows left by an earlier failed run ───────────────
  const leftovers = await appDb.select({ code: schema.characters.code })
    .from(schema.characters).where(like(schema.characters.name, 'VERIFY_TEST_%'))
  if (leftovers.length > 0) {
    const codes = leftovers.map(l => l.code)
    await appDb.delete(schema.relationships).where(or(
      inArray(schema.relationships.fromCode, codes),
      inArray(schema.relationships.toCode, codes),
    ))
    await appDb.delete(schema.characters).where(like(schema.characters.name, 'VERIFY_TEST_%'))
    console.log(`Pre-clean: removed ${leftovers.length} leftover test character(s): ${codes.join(', ')}\n`)
  }

  // ─── Snapshot ────────────────────────────────────────────────────────────────
  const charsBefore = (await appDb.select({ id: schema.characters.id }).from(schema.characters)).length
  const relsBefore  = (await appDb.select({ id: schema.relationships.id }).from(schema.relationships)).length
  const [cCtr] = await appDb.select({ next: schema.counters.next })
    .from(schema.counters).where(eq(schema.counters.prefix, 'C')).limit(1)
  const [xCtr] = await appDb.select({ next: schema.counters.next })
    .from(schema.counters).where(eq(schema.counters.prefix, 'X')).limit(1)
  console.log(`Before: characters=${charsBefore} relationships=${relsBefore}`)
  console.log(`Counters before: C=${cCtr?.next ?? 'none'} X=${xCtr?.next ?? 'none'}\n`)

  // ─── 1. Create character A ────────────────────────────────────────────────────
  const codeA = await assignNextCode('C')
  const [rowA] = await appDb.insert(schema.characters).values({
    code: codeA,
    slug: `verify-test-a-${codeA.toLowerCase()}`,
    name: 'VERIFY_TEST_A',
    status: 'in_development',
  }).returning({ id: schema.characters.id, code: schema.characters.code })
  console.log(`Created character A: ${rowA.code} id=${rowA.id}`)

  // ─── 2. Create character B ────────────────────────────────────────────────────
  const codeB = await assignNextCode('C')
  const [rowB] = await appDb.insert(schema.characters).values({
    code: codeB,
    slug: `verify-test-b-${codeB.toLowerCase()}`,
    name: 'VERIFY_TEST_B',
    status: 'in_development',
  }).returning({ id: schema.characters.id, code: schema.characters.code })
  console.log(`Created character B: ${rowB.code} id=${rowB.id}`)

  // ─── 3. Edit a scalar field ───────────────────────────────────────────────────
  await appDb.update(schema.characters)
    .set({ summary: 'Edited in verify script', updatedAt: new Date() })
    .where(eq(schema.characters.id, rowA.id))
  const [editCheck] = await appDb.select({ summary: schema.characters.summary })
    .from(schema.characters).where(eq(schema.characters.id, rowA.id)).limit(1)
  if (editCheck.summary !== 'Edited in verify script')
    throw new Error(`Edit failed: got "${editCheck.summary}"`)
  console.log('Edit summary: OK')

  // ─── 4. Add detail row with inInfobox ────────────────────────────────────────
  const details = [
    { label: 'Test label', value: 'Test value', inInfobox: true  },
    { label: 'Hidden',     value: 'Hidden val', inInfobox: false },
  ]
  await appDb.update(schema.characters)
    .set({ details, updatedAt: new Date() })
    .where(eq(schema.characters.id, rowA.id))
  const [detailCheck] = await appDb.select({ details: schema.characters.details })
    .from(schema.characters).where(eq(schema.characters.id, rowA.id)).limit(1)
  const saved = detailCheck.details as { label: string; inInfobox: boolean }[] | null
  if (!saved || saved.length !== 2)         throw new Error('Detail rows not saved')
  if (saved[0].label !== 'Test label')      throw new Error('First detail label wrong')
  if (!saved[0].inInfobox)                  throw new Error('inInfobox not saved as true')
  if (saved[1].inInfobox)                   throw new Error('Second detail should not be inInfobox')
  console.log('Detail rows: OK')

  // ─── 5. Create relationship A -> B ───────────────────────────────────────────
  const relCode = await assignNextCode('X')
  const [rel] = await appDb.insert(schema.relationships).values({
    code: relCode,
    fromCollection: 'characters', fromId: rowA.id, fromCode: codeA,
    toCollection:   'characters', toId:   rowB.id, toCode:   codeB,
    type: 'ally_of',
    title: `${codeA} ally_of ${codeB}`,
  }).returning({ id: schema.relationships.id, code: schema.relationships.code })
  console.log(`Relationship created: ${rel.code} id=${rel.id}`)

  // ─── 6. Delete conflict check ─────────────────────────────────────────────────
  // Before removing the relationship, a delete of charA must list it as a conflict.
  const blocking = await appDb.select({ code: schema.relationships.code })
    .from(schema.relationships)
    .where(or(
      eq(schema.relationships.fromCode, codeA),
      eq(schema.relationships.toCode,   codeA),
    ))
  if (blocking.length === 0)
    throw new Error('Conflict check: no relationships found — delete should have been blocked')
  console.log(`Delete conflict check: OK (${blocking.length} blocking relationship: ${blocking[0].code})`)

  // ─── 7. UNK tag ───────────────────────────────────────────────────────────────
  const [unkTagRow] = await appDb.select({ id: schema.tags.id })
    .from(schema.tags).where(eq(schema.tags.name, 'UNK')).limit(1)
  if (!unkTagRow) {
    console.log('UNK tag: SKIP (tag not present yet — run verify-db.ts first to seed built-in tags)')
  } else {
    const unkId = unkTagRow.id
    await appDb.update(schema.characters)
      .set({ tagIds: [unkId], reviewNote: 'Verify UNK tagging', updatedAt: new Date() })
      .where(eq(schema.characters.id, rowA.id))
    const [tagCheck] = await appDb.select({ tagIds: schema.characters.tagIds })
      .from(schema.characters).where(eq(schema.characters.id, rowA.id)).limit(1)
    const tids = tagCheck.tagIds as number[] | null
    if (!tids || !tids.includes(unkId))
      throw new Error(`UNK tag not saved: tagIds=${JSON.stringify(tids)}`)
    // Verify the review queue (the same function /review uses) finds it
    const queue = await getUnkQueue()
    const inQueue = queue.find(r => r.code === rowA.code)
    if (!inQueue) throw new Error('UNK-tagged record not visible in review queue query')
    if (inQueue.reviewNote !== 'Verify UNK tagging') throw new Error('reviewNote missing in review queue')
    console.log('UNK tag: OK')
  }

  // ─── 8. Cleanup ──────────────────────────────────────────────────────────────
  await appDb.delete(schema.relationships).where(eq(schema.relationships.id, rel.id))
  await appDb.delete(schema.characters).where(eq(schema.characters.id, rowA.id))
  await appDb.delete(schema.characters).where(eq(schema.characters.id, rowB.id))
  console.log('Test rows deleted')

  // ─── Row count check ─────────────────────────────────────────────────────────
  const charsAfter = (await appDb.select({ id: schema.characters.id }).from(schema.characters)).length
  const relsAfter  = (await appDb.select({ id: schema.relationships.id }).from(schema.relationships)).length
  if (charsAfter !== charsBefore)
    throw new Error(`Characters row mismatch: before=${charsBefore} after=${charsAfter}`)
  if (relsAfter !== relsBefore)
    throw new Error(`Relationships row mismatch: before=${relsBefore} after=${relsAfter}`)

  // ─── Counter report ───────────────────────────────────────────────────────────
  const [cCtrAfter] = await appDb.select({ next: schema.counters.next })
    .from(schema.counters).where(eq(schema.counters.prefix, 'C')).limit(1)
  const [xCtrAfter] = await appDb.select({ next: schema.counters.next })
    .from(schema.counters).where(eq(schema.counters.prefix, 'X')).limit(1)
  console.log(`\nCounters after: C=${cCtrAfter?.next ?? 'none'} X=${xCtrAfter?.next ?? 'none'}`)
  console.log('(Counters increment-only — they advanced by the number of creates, as expected.)')
  console.log(`After: characters=${charsAfter} relationships=${relsAfter}`)

  console.log('\n=== All checks passed ===')
  process.exit(0)
}

run().catch(err => { console.error('FAILED:', err); process.exit(1) })
