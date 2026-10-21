// Verification script for Part 3: create, edit, relate, delete
// Run: npx tsx --env-file=.env.local scripts/verify-world-edit.ts
// Creates test records, edits them, adds a relationship, deletes all and verifies counters.

import { getPayload } from 'payload'
import config from '../payload.config'

async function run() {
  const payload = await getPayload({ config })

  // Snapshot counts
  const before: Record<string, number> = {}
  for (const col of ['characters', 'relationships']) {
    const { totalDocs } = await payload.find({ collection: col as never, limit: 0, depth: 0 })
    before[col] = totalDocs
  }
  console.log('Before:', before)

  // Create test character A
  const charA = await payload.create({
    collection: 'characters',
    data: { name: 'VERIFY_TEST_A', status: 'in_development' } as never,
    depth: 0,
  })
  const codeA = (charA as { code?: string }).code ?? ''
  console.log(`Created character A: ${codeA} id=${charA.id}`)

  // Create test character B
  const charB = await payload.create({
    collection: 'characters',
    data: { name: 'VERIFY_TEST_B', status: 'in_development' } as never,
    depth: 0,
  })
  const codeB = (charB as { code?: string }).code ?? ''
  console.log(`Created character B: ${codeB} id=${charB.id}`)

  // Edit a field on A
  await payload.update({
    collection: 'characters',
    id: charA.id,
    data: { summary: 'Edited in verify script' } as never,
    depth: 0,
  })
  const updated = await payload.findByID({ collection: 'characters', id: charA.id, depth: 0 })
  const summary = (updated as { summary?: string }).summary
  if (summary !== 'Edited in verify script') throw new Error(`Edit failed: got "${summary}"`)
  console.log('Edit: OK')

  // Add a detail row
  await payload.update({
    collection: 'characters',
    id: charA.id,
    data: { details: [{ label: 'Test label', value: 'Test value', inInfobox: false }] } as never,
    depth: 0,
  })
  const withDetail = await payload.findByID({ collection: 'characters', id: charA.id, depth: 0 })
  const details = (withDetail as { details?: { label: string }[] }).details
  if (!details || details[0]?.label !== 'Test label') throw new Error('Detail row add failed')
  console.log('Detail row: OK')

  // Add a relationship
  const rel = await payload.create({
    collection: 'relationships',
    data: {
      from: { relationTo: 'characters', value: charA.id },
      to: { relationTo: 'characters', value: charB.id },
      fromCode: codeA,
      toCode: codeB,
      type: 'ally_of',
    } as never,
    depth: 0,
  })
  console.log(`Relationship created: id=${rel.id}`)

  // Verify conflict check: A has relationship, delete should return conflicts
  const { docs: fromRels } = await payload.find({
    collection: 'relationships',
    where: { fromCode: { equals: codeA } },
    limit: 5,
    depth: 0,
  })
  if (fromRels.length === 0) throw new Error('Relationship not found after create')
  console.log('Conflict check data: OK')

  // Delete relationship first
  await payload.delete({ collection: 'relationships', id: rel.id })
  console.log('Relationship deleted')

  // Delete test records
  await payload.delete({ collection: 'characters', id: charA.id })
  await payload.delete({ collection: 'characters', id: charB.id })
  console.log('Test records deleted')

  // Verify counters returned to baseline
  const after: Record<string, number> = {}
  for (const col of ['characters', 'relationships']) {
    const { totalDocs } = await payload.find({ collection: col as never, limit: 0, depth: 0 })
    after[col] = totalDocs
  }
  console.log('After:', after)

  for (const col of ['characters', 'relationships']) {
    if (after[col] !== before[col]) {
      throw new Error(`Counter mismatch for ${col}: before=${before[col]} after=${after[col]}`)
    }
  }

  console.log('\nAll checks passed.')
  process.exit(0)
}

run().catch(err => { console.error('FAILED:', err); process.exit(1) })
