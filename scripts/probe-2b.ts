import { getPayload } from 'payload'
import config from '../payload.config'

const payload = await getPayload({ config })
const pl = payload as any

// Counters
const ctrs = await pl.find({ collection: 'counters', limit: 20, depth: 0 })
console.log('Counters:')
for (const c of ctrs.docs) console.log(`  ${c.prefix}: next=${c.next}`)

// UNK stories
const unkTag = await pl.find({ collection: 'tags', where: { code: { equals: 'T1' } }, limit: 1, depth: 0 })
const unkTagId = unkTag.docs[0]?.id
console.log(`\nUNK tag id: ${unkTagId}`)

// Stories with UNK tag
const unkStories = await pl.find({
  collection: 'stories',
  where: { tags: { in: [unkTagId] } },
  limit: 60,
  depth: 0,
})
console.log(`Stories with UNK tag: ${unkStories.totalDocs}`)

// /api/unk endpoint — probe via local find on the four collections that can carry UNK
const unkQueue: string[] = []
for (const coll of ['characters','locations','events','stories','relationships']) {
  const r = await pl.find({ collection: coll, where: { tags: { in: [unkTagId] } }, limit: 1, depth: 0 })
  if (r.totalDocs > 0) unkQueue.push(`${coll}: ${r.totalDocs}`)
}
console.log('\nUNK queue (stories included):')
for (const line of unkQueue) console.log(' ', line)

await pl.db?.destroy()
