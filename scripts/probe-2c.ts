import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config })
const pl = payload as any

// Check for Eron, Menas, Local Lord of Renmark
const namesToCheck = ['Eron', 'Menas', 'Local Lord']
console.log('Checking characters by name:')
for (const name of namesToCheck) {
  const r = await pl.find({ collection: 'characters', where: { name: { like: name } }, limit: 5, depth: 0 })
  console.log(`  "${name}": ${r.totalDocs} result(s)`)
  for (const doc of r.docs) console.log(`    -> code=${doc.code}  name="${doc.name}"  status=${doc.status}`)
}

// Check Maren in locations
const maren = await pl.find({ collection: 'locations', where: { name: { like: 'Maren' } }, limit: 5, depth: 0 })
console.log(`\n"Maren" in locations: ${maren.totalDocs} result(s)`)
for (const doc of maren.docs) console.log(`  -> code=${doc.code}  name="${doc.name}"`)

// Full character list
console.log('\n--- ALL CHARACTERS ---')
const chars = await pl.find({ collection: 'characters', limit: 100, depth: 0 })
console.log(`Total: ${chars.totalDocs}`)
for (const doc of chars.docs) console.log(`  ${doc.code}  |  ${doc.name}  |  ${doc.status}`)

// Full location list
console.log('\n--- ALL LOCATIONS ---')
const locs = await pl.find({ collection: 'locations', limit: 100, depth: 0 })
console.log(`Total: ${locs.totalDocs}`)
for (const doc of locs.docs) console.log(`  ${doc.code}  |  ${doc.name}  |  ${doc.status}`)

await pl.db?.destroy()
