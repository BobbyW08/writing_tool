/**
 * verify-w1.ts  —  Media / infobox verification (Part 5)
 *
 * Tests:
 *   1. Create a character with role, birthYear and two detail rows (one inInfobox).
 *   2. Insert a media row directly (no HTTP — scripts can't call the upload route).
 *   3. Attach imageId to the character.
 *   4. Verify role, birthYear, inInfobox detail and imageId are all readable.
 *   5. Replace imageId with a second media row.
 *   6. Remove imageId (set to null).
 *   7. Check INFOBOX_FIELDS contains role and birthYear for characters.
 *   8. Clean up all test rows and confirm row counts.
 *
 * Run: npx tsx --env-file=.env.local scripts/verify-w1.ts
 */

import { eq } from 'drizzle-orm'
import { appDb } from '../db/index'
import * as schema from '../db/schema'
import { assignNextCode } from '../db/codes'
import { INFOBOX_FIELDS } from '../lib/infobox'

async function run() {
  console.log('=== verify-w1 ===\n')

  // ─── Snapshot ────────────────────────────────────────────────────────────────
  const charsBefore  = (await appDb.select({ id: schema.characters.id }).from(schema.characters)).length
  const mediaBefore  = (await appDb.select({ id: schema.media.id }).from(schema.media)).length
  const [cCtr] = await appDb.select({ next: schema.counters.next })
    .from(schema.counters).where(eq(schema.counters.prefix, 'C')).limit(1)
  console.log(`Before: characters=${charsBefore} media=${mediaBefore} C-counter=${cCtr?.next ?? 'none'}\n`)

  // ─── 1. Create character with role, birthYear and detail rows ─────────────────
  const code = await assignNextCode('C')
  const details = [
    { label: 'Weapon',  value: 'Sword',  inInfobox: true  },
    { label: 'Private', value: 'Hidden', inInfobox: false },
  ]
  const [char] = await appDb.insert(schema.characters).values({
    code,
    slug:      `verify-w1-${code.toLowerCase()}`,
    name:      'VERIFY_W1_CHAR',
    status:    'in_development',
    role:      'Test role',
    birthYear: 100,
    details,
  }).returning({ id: schema.characters.id, code: schema.characters.code })
  console.log(`Created character: ${char.code} id=${char.id}`)

  // ─── 2. Insert two media rows directly ───────────────────────────────────────
  const [media1] = await appDb.insert(schema.media).values({
    filename: 'verify-w1-portrait-1.jpg',
    mimeType: 'image/jpeg',
    filesize: 1024,
    width: 400, height: 600,
    alt: 'Test portrait 1',
    url: '/api/uploads/verify-w1-portrait-1.jpg',
    sizes: {},
  }).returning({ id: schema.media.id })

  const [media2] = await appDb.insert(schema.media).values({
    filename: 'verify-w1-portrait-2.jpg',
    mimeType: 'image/jpeg',
    filesize: 2048,
    width: 400, height: 600,
    alt: 'Test portrait 2',
    url: '/api/uploads/verify-w1-portrait-2.jpg',
    sizes: {},
  }).returning({ id: schema.media.id })
  console.log(`Inserted media rows: id=${media1.id} id=${media2.id}`)

  // ─── 3. Attach first imageId to character ────────────────────────────────────
  await appDb.update(schema.characters)
    .set({ imageId: media1.id, updatedAt: new Date() })
    .where(eq(schema.characters.id, char.id))

  // ─── 4. Read back and verify all fields ──────────────────────────────────────
  const [fetched] = await appDb.select().from(schema.characters)
    .where(eq(schema.characters.id, char.id)).limit(1)
  if (fetched.role !== 'Test role')     throw new Error(`role not saved: "${fetched.role}"`)
  if (fetched.birthYear !== 100)        throw new Error(`birthYear not saved: ${fetched.birthYear}`)
  if (fetched.imageId !== media1.id)    throw new Error(`imageId not saved: ${fetched.imageId}`)
  const savedDetails = fetched.details as { label: string; inInfobox: boolean }[] | null
  if (!savedDetails || savedDetails.length !== 2) throw new Error('detail rows not saved')
  const infoboxRow = savedDetails.find(d => d.inInfobox)
  if (!infoboxRow)                      throw new Error('inInfobox detail row not found')
  if (infoboxRow.label !== 'Weapon')    throw new Error(`inInfobox label wrong: "${infoboxRow.label}"`)
  const hiddenRow = savedDetails.find(d => !d.inInfobox)
  if (!hiddenRow || hiddenRow.label !== 'Private') throw new Error('non-infobox detail row wrong')
  console.log('role, birthYear, imageId, detail rows, inInfobox: OK')

  // ─── 5. INFOBOX_FIELDS check ─────────────────────────────────────────────────
  const charFields = INFOBOX_FIELDS['characters'] ?? []
  const hasRole     = charFields.some(f => f.field === 'role')
  const hasBirthYear = charFields.some(f => f.field === 'birthYear')
  if (!hasRole)      throw new Error(`INFOBOX_FIELDS missing "role" for characters: ${JSON.stringify(charFields)}`)
  if (!hasBirthYear) throw new Error(`INFOBOX_FIELDS missing "birthYear" for characters: ${JSON.stringify(charFields)}`)
  console.log('INFOBOX_FIELDS contains role and birthYear: OK')

  // ─── 6. Replace imageId with second media row ────────────────────────────────
  await appDb.update(schema.characters)
    .set({ imageId: media2.id, updatedAt: new Date() })
    .where(eq(schema.characters.id, char.id))
  const [afterReplace] = await appDb.select({ imageId: schema.characters.imageId })
    .from(schema.characters).where(eq(schema.characters.id, char.id)).limit(1)
  if (afterReplace.imageId !== media2.id)
    throw new Error(`Replace imageId failed: got ${afterReplace.imageId}`)
  console.log('Replace imageId: OK')

  // ─── 7. Remove imageId ───────────────────────────────────────────────────────
  await appDb.update(schema.characters)
    .set({ imageId: null, updatedAt: new Date() })
    .where(eq(schema.characters.id, char.id))
  const [afterRemove] = await appDb.select({ imageId: schema.characters.imageId })
    .from(schema.characters).where(eq(schema.characters.id, char.id)).limit(1)
  if (afterRemove.imageId !== null)
    throw new Error(`Remove imageId failed: got ${afterRemove.imageId}`)
  console.log('Remove imageId: OK')

  // ─── 8. Cleanup ──────────────────────────────────────────────────────────────
  await appDb.delete(schema.characters).where(eq(schema.characters.id, char.id))
  await appDb.delete(schema.media).where(eq(schema.media.id, media1.id))
  await appDb.delete(schema.media).where(eq(schema.media.id, media2.id))
  console.log('Test rows deleted')

  // ─── Row count check ─────────────────────────────────────────────────────────
  const charsAfter = (await appDb.select({ id: schema.characters.id }).from(schema.characters)).length
  const mediaAfter = (await appDb.select({ id: schema.media.id }).from(schema.media)).length
  if (charsAfter !== charsBefore) throw new Error(`Characters row mismatch: before=${charsBefore} after=${charsAfter}`)
  if (mediaAfter !== mediaBefore) throw new Error(`Media row mismatch: before=${mediaBefore} after=${mediaAfter}`)

  // ─── Counter report ───────────────────────────────────────────────────────────
  const [cCtrAfter] = await appDb.select({ next: schema.counters.next })
    .from(schema.counters).where(eq(schema.counters.prefix, 'C')).limit(1)
  console.log(`\nC counter before=${cCtr?.next ?? 'none'} after=${cCtrAfter?.next ?? 'none'}`)
  console.log('(Counter incremented by 1 for the character create; delete does not restore it — expected.)')
  console.log(`After: characters=${charsAfter} media=${mediaAfter}`)

  console.log('\n=== All checks passed ===')
  process.exit(0)
}

run().catch(err => { console.error('FAILED:', err); process.exit(1) })
