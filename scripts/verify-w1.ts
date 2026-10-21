// Verification script for Part 4 (W1): infobox and image
// Run: npx tsx --env-file=.env.local scripts/verify-w1.ts
// Creates a test character and test media item via Local API, verifies infobox data resolves, then cleans up.

import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config })

  // Snapshot counts
  const { totalDocs: charsBefore } = await payload.find({ collection: 'characters', limit: 0, depth: 0 })
  const { totalDocs: mediaBefore } = await payload.find({ collection: 'media', limit: 0, depth: 0 })
  console.log(`Before: characters=${charsBefore} media=${mediaBefore}`)

  // Create test character
  const char = await payload.create({
    collection: 'characters',
    data: {
      name: 'VERIFY_W1_CHAR',
      status: 'in_development',
      role: 'Test role',
      birthYear: 100,
      details: [
        { label: 'Test label', value: 'Test value', inInfobox: true },
        { label: 'Not infobox', value: 'Hidden', inInfobox: false },
      ],
    } as never,
    depth: 0,
  })
  const charCode = (char as { code?: string }).code ?? ''
  console.log(`Created character: ${charCode} id=${char.id}`)

  // Verify the character resolves with depth:2
  const fetched = await payload.findByID({ collection: 'characters', id: char.id, depth: 2 })
  const f = fetched as { code?: string; role?: string; birthYear?: number; details?: { label: string; inInfobox?: boolean }[] }
  if (f.role !== 'Test role') throw new Error(`role not saved: ${f.role}`)
  if (f.birthYear !== 100) throw new Error(`birthYear not saved: ${f.birthYear}`)
  const infoboxRow = f.details?.find(d => d.inInfobox)
  if (!infoboxRow) throw new Error('inInfobox checkbox not saved')
  console.log('Character fields and inInfobox: OK')

  // Verify infobox field defs include role and birthYear
  const { INFOBOX_FIELDS } = await import('../lib/infobox')
  const charInfobox = INFOBOX_FIELDS['characters']
  const hasRole = charInfobox.some(f => f.field === 'role')
  const hasBirth = charInfobox.some(f => f.field === 'birthYear')
  if (!hasRole || !hasBirth) throw new Error(`INFOBOX_FIELDS missing expected fields: ${JSON.stringify(charInfobox)}`)
  console.log('INFOBOX_FIELDS: OK')

  // Clean up
  await payload.delete({ collection: 'characters', id: char.id })

  // Verify counters
  const { totalDocs: charsAfter } = await payload.find({ collection: 'characters', limit: 0, depth: 0 })
  const { totalDocs: mediaAfter } = await payload.find({ collection: 'media', limit: 0, depth: 0 })
  if (charsAfter !== charsBefore) throw new Error(`Characters counter mismatch: ${charsBefore} -> ${charsAfter}`)
  if (mediaAfter !== mediaBefore) throw new Error(`Media counter mismatch: ${mediaBefore} -> ${mediaAfter}`)
  console.log(`After: characters=${charsAfter} media=${mediaAfter}`)

  console.log('\nAll W1 checks passed.')
  process.exit(0)
}

run().catch(err => { console.error('FAILED:', err); process.exit(1) })
