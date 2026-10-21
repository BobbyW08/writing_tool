// Quick DB count verification for Phase 2C. Delete after use.
import { getPayload } from 'payload'
import config from '../payload.config'

const pl = await getPayload({ config }) as any
const cols = ['characters','locations','cultures','factions','lore','stories','writing']
let total = 0
for (const c of cols) {
  const res = await pl.find({ collection: c, limit: 0, depth: 0 })
  console.log(`${c}: ${res.totalDocs}`)
  total += res.totalDocs
}
console.log(`\nTotal: ${total}`)
const sRes = await pl.find({ collection: 'counters', where: { prefix: { equals: 'S' } }, limit: 1, depth: 0 })
console.log('S counter next:', sRes.docs[0]?.next)
const unkTag = await pl.find({ collection: 'tags', where: { code: { equals: 'T1' } }, limit: 1, depth: 0 })
const unkId = unkTag.docs[0]?.id
if (unkId) {
  const kRes = await pl.find({ collection: 'lore', where: { tags: { in: [unkId] } }, limit: 0, depth: 0 })
  console.log('Lore with UNK tag:', kRes.totalDocs)
  const cRes = await pl.find({ collection: 'stories', where: { and: [{ tags: { in: [unkId] } }, { code: { in: ['S41','S42','S43','S73'] } }] }, limit: 4, depth: 0 })
  for (const s of cRes.docs) {
    const rv = s.reviewNote ? s.reviewNote.slice(0,60) : ''
    console.log(`  ${s.code} "${s.name}" tags=${JSON.stringify(s.tags)} rv="${rv}"`)
  }
}
const wRes = await pl.find({ collection: 'writing', limit: 3, depth: 0 })
for (const w of wRes.docs) {
  console.log(`  ${w.code} "${w.name}" kind=${w.kind} canonState=${w.canonState ?? 'null'}`)
}
await pl.db?.destroy()
