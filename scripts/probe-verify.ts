import { getPayload } from 'payload'
import config from '../payload.config'
import { neon } from '@neondatabase/serverless'

const oldSql = neon(process.env.DATABASE_URL!)
const payload = await getPayload({ config })
const pl = payload as any

const eventsAll = await pl.find({ collection: 'events', limit: 200, depth: 1 })
let totalInvolves = 0
let eventsWithLocation = 0
for (const ev of eventsAll.docs) {
  totalInvolves += (ev.involves ?? []).length
  if (ev.location) eventsWithLocation++
}
console.log(`Total involves entries: ${totalInvolves}`)
console.log(`Events with location: ${eventsWithLocation}`)

console.log('\nEvent text comparison (whatHappened):')
for (const code of ['E1', 'E5', 'E10']) {
  const res = await pl.find({ collection: 'events', where: { code: { equals: code } }, limit: 1, depth: 0 })
  if (!res.docs.length) { console.log(`  ${code}: not found`); continue }
  const ev = res.docs[0]
  const oldRows = await oldSql`SELECT what_happened FROM events WHERE id = ${ev.legacyId}`
  const oldText: string | null = oldRows[0]?.what_happened ?? null
  const newText: string | null = ev.whatHappened ?? null
  if (oldText === null && newText === null) console.log(`  ${code}: both null — MATCH`)
  else if (oldText === newText) console.log(`  ${code}: MATCH`)
  else { console.log(`  ${code}: MISMATCH`); console.log(`    old: ${JSON.stringify(oldText?.slice(0,80))}`); console.log(`    new: ${JSON.stringify(newText?.slice(0,80))}`) }
}

console.log('\nCharacter gapPrompt comparison:')
for (const code of ['C1', 'C3']) {
  const res = await pl.find({ collection: 'characters', where: { code: { equals: code } }, limit: 1, depth: 0 })
  if (!res.docs.length) { console.log(`  ${code}: not found`); continue }
  const ent = res.docs[0]
  const oldRows = await oldSql`SELECT gap_prompt FROM entities WHERE id = ${ent.legacyId}`
  const oldGap: string | null = oldRows[0]?.gap_prompt ?? null
  const newGap: string | null = ent.gapPrompt ?? null
  if (oldGap === null && newGap === null) console.log(`  ${code}: both null — MATCH`)
  else if (oldGap === newGap) console.log(`  ${code}: MATCH`)
  else { console.log(`  ${code}: MISMATCH`); console.log(`    old: ${JSON.stringify(oldGap?.slice(0,80))}`); console.log(`    new: ${JSON.stringify(newGap?.slice(0,80))}`) }
}

await pl.db?.destroy()
