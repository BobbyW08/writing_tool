// Phase 2C: Apply staged story-bible records (characters, locations, cultures,
// factions, lore, stories, writing).
//
// Run:   npx tsx --env-file=.env.local scripts/import-story-bible.ts
//        npx tsx --env-file=.env.local scripts/import-story-bible.ts --apply

import { readFileSync } from 'fs'
import { getPayload } from 'payload'
import config from '../payload.config'

const APPLY = process.argv.includes('--apply')

// ── Lexical helper (same as migrate-legacy.ts) ────────────────────────────────
function textToLexical(text: string) {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  if (!paragraphs.length) return null
  return {
    root: {
      type: 'root', direction: 'ltr', format: '', indent: 0, version: 1,
      children: paragraphs.map((p) => ({
        type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0,
        textFormat: 0, textStyle: '',
        children: [{ type: 'text', version: 1, text: p, mode: 'normal', format: 0, detail: 0, style: '' }],
      })),
    },
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface StagedRecord {
  collection: string
  proposed_code: string
  source_doc_id: string
  name?: string
  title?: string
  status?: string
  era?: string
  format?: string | null
  start_year?: number | null
  end_year?: number | null
  year_label?: string | null
  stage?: string
  kind?: string
  linked_story?: string | null
  category?: string
  body?: string
  gap_prompt?: string
  review_note?: string
  unk?: boolean
}

interface StagedFile {
  records: StagedRecord[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function recordName(r: StagedRecord): string {
  return (r.name || r.title || '').trim()
}

function compositeKey(r: StagedRecord): string {
  return `${r.collection}|${r.source_doc_id}|${recordName(r)}`
}

// ── Load and validate staged file ─────────────────────────────────────────────
const file: StagedFile = JSON.parse(readFileSync('staging/story-bible.json', 'utf8'))

// Step 3: verify key uniqueness
const seen = new Map<string, number>()
const duplicates: string[] = []
for (const r of file.records) {
  const k = compositeKey(r)
  seen.set(k, (seen.get(k) ?? 0) + 1)
  if (seen.get(k)! > 1) duplicates.push(k)
}
if (duplicates.length) {
  console.error('DUPLICATE KEYS in staged file — stop.')
  duplicates.forEach((d) => console.error(' ', d))
  process.exit(1)
}
console.log(`Staged records: ${file.records.length} — keys unique: OK`)

const byCollection: Record<string, StagedRecord[]> = {}
for (const r of file.records) {
  if (!byCollection[r.collection]) byCollection[r.collection] = []
  byCollection[r.collection].push(r)
}

const COLLECTION_ORDER = ['characters', 'locations', 'cultures', 'factions', 'lore', 'stories', 'writing']
for (const col of COLLECTION_ORDER) {
  const n = byCollection[col]?.length ?? 0
  console.log(`  ${col}: ${n}`)
}

// ── Connect DB ────────────────────────────────────────────────────────────────
const payload = await getPayload({ config })
const pl = payload as any

// ── Step 4: pre-apply name check against live DB ──────────────────────────────
console.log('\nPre-apply DB name check:')
const nameMatches: Array<{ staged: string; collection: string; existing: string }> = []
for (const r of file.records) {
  const name = recordName(r)
  const res = await pl.find({
    collection: r.collection,
    where: { name: { equals: name } },
    limit: 1,
    depth: 0,
  })
  if (res.docs.length > 0) {
    nameMatches.push({ staged: name, collection: r.collection, existing: res.docs[0].code })
  }
}
if (nameMatches.length === 0) {
  console.log('  No name conflicts with existing records.')
} else {
  console.log(`  ${nameMatches.length} name match(es) — these will be skipped:`)
  for (const m of nameMatches) {
    console.log(`    ${m.collection} "${m.staged}" -> existing ${m.existing}`)
  }
}

// ── Step 5: read counters before apply ────────────────────────────────────────
console.log('\nCounters before apply:')
const PREFIXES = ['C', 'L', 'U', 'F', 'K', 'S', 'W']
const countersBefore: Record<string, number> = {}
for (const prefix of PREFIXES) {
  const res = await pl.find({
    collection: 'counters',
    where: { prefix: { equals: prefix } },
    limit: 1,
    depth: 0,
  })
  countersBefore[prefix] = res.docs[0]?.next ?? 1
  console.log(`  ${prefix}: next=${countersBefore[prefix]}`)
}

const sNext = countersBefore['S']
if (sNext < 41) {
  console.error(`\nCounter mismatch: S counter next=${sNext}, expected >=41 (Phase 2B must create S1-S40 first). Stop.`)
  await pl.db?.destroy()
  process.exit(1)
} else if (sNext === 41) {
  console.log('\nS counter OK: next=41, new stories will be S41-S73.')
} else {
  console.log(`\nS counter at ${sNext} (stories already created in a prior run — records will be skipped if existing).`)
}

// ── Dry run: report and exit ──────────────────────────────────────────────────
if (!APPLY) {
  console.log('\n--- Dry run complete ---')
  console.log(`Total staged: ${file.records.length}`)
  console.log('Expected to create (minus any name matches above):',
    file.records.length - nameMatches.length)
  console.log('\nRun with --apply to create records.')
  await pl.db?.destroy()
  process.exit(0)
}

// ── Apply ─────────────────────────────────────────────────────────────────────
console.log('\n--- Apply ---')

const unkRes = await pl.find({ collection: 'tags', where: { code: { equals: 'T1' } }, limit: 1, depth: 0 })
const unkTagId: string | null = unkRes.docs[0]?.id ?? null
if (!unkTagId) {
  console.error('UNK tag (T1) not found — check that onInit ran.')
  await pl.db?.destroy()
  process.exit(1)
}
console.log(`UNK tag ID: ${unkTagId}`)

// Resolve S1 for writing records that link to it
const s1Res = await pl.find({ collection: 'stories', where: { code: { equals: 'S1' } }, limit: 1, depth: 0 })
const s1Id: string | null = s1Res.docs[0]?.id ?? null
if (!s1Id) {
  console.error('Story S1 not found — Phase 2B must be applied first.')
  await pl.db?.destroy()
  process.exit(1)
}
console.log(`S1 Payload ID: ${s1Id}`)

let created = 0
let skipped = 0
const sampleRecords: unknown[] = []

for (const col of COLLECTION_ORDER) {
  const records = byCollection[col] ?? []
  if (!records.length) continue

  console.log(`\n  ${col} (${records.length}):`)

  for (const r of records) {
    const name = recordName(r)

    // Idempotency check: (collection, sourceDocId, name)
    const existingRes = await pl.find({
      collection: r.collection,
      where: {
        and: [
          { sourceDocId: { equals: r.source_doc_id } },
          { name: { equals: name } },
        ],
      },
      limit: 1,
      depth: 0,
    })

    if (existingRes.docs.length > 0) {
      process.stdout.write(`    S ${name}\n`)
      skipped++
      continue
    }

    // Build create data
    const data: Record<string, unknown> = {
      name,
      sourceDocId: r.source_doc_id,
      ...(r.unk && unkTagId ? { tags: [unkTagId] } : {}),
      ...(r.review_note ? { reviewNote: r.review_note } : {}),
    }

    if (col === 'writing') {
      // Writing: text (richText), kind, story
      data.text = textToLexical(r.body ?? '') ?? textToLexical('(no text)')
      if (r.kind) data.kind = r.kind
      if (r.linked_story === 'S1' && s1Id) data.story = s1Id
    } else {
      // All other entity collections: status, body, gapPrompt
      if (r.status) data.status = r.status
      if (r.body) data.body = textToLexical(r.body)
      if (r.gap_prompt) data.gapPrompt = r.gap_prompt

      if (col === 'lore') {
        if (r.category) data.category = r.category
      }

      if (col === 'stories') {
        // Stories use stage, not status. format null -> omit.
        delete data.status
        if (r.stage) data.stage = r.stage
        if (r.era) data.era = r.era
        if (r.format != null) data.format = r.format
        if (r.year_label) data.yearLabel = r.year_label
        if (r.start_year != null) data.startYear = r.start_year
        if (r.end_year != null) data.endYear = r.end_year
        // body is set above via the generic path
      }
    }

    await pl.create({ collection: r.collection as any, data })
    process.stdout.write(`    + ${name}\n`)
    created++

    if (sampleRecords.length < 5) {
      const verify = await pl.find({
        collection: r.collection,
        where: { name: { equals: name } },
        limit: 1,
        depth: 0,
      })
      sampleRecords.push(verify.docs[0])
    }
  }
}

// ── Step 8: Add alias "Aldric Chaudry" to C4 ─────────────────────────────────
console.log('\nStep 8: adding alias Aldric Chaudry to C4')
const c4Res = await pl.find({ collection: 'characters', where: { code: { equals: 'C4' } }, limit: 1, depth: 0 })
const c4 = c4Res.docs[0]
if (!c4) {
  console.error('C4 not found — cannot add alias.')
} else {
  const before = c4.aliases ?? []
  console.log('  C4 before aliases:', JSON.stringify(before))
  const alreadyHas = (before as any[]).some((a: any) => a.alias === 'Aldric Chaudry')
  if (alreadyHas) {
    console.log('  Alias already present — skip.')
  } else {
    const newAliases = [...before, { alias: 'Aldric Chaudry' }]
    await pl.update({ collection: 'characters', id: c4.id, data: { aliases: newAliases } })
    const c4After = await pl.findByID({ collection: 'characters', id: c4.id, depth: 0 })
    console.log('  C4 after aliases:', JSON.stringify(c4After.aliases))
  }
}

// ── Step 9: Counters after apply ──────────────────────────────────────────────
console.log('\nCounters after apply:')
for (const prefix of PREFIXES) {
  const res = await pl.find({
    collection: 'counters',
    where: { prefix: { equals: prefix } },
    limit: 1,
    depth: 0,
  })
  const nextAfter = res.docs[0]?.next ?? 1
  const delta = nextAfter - countersBefore[prefix]
  console.log(`  ${prefix}: next=${nextAfter} (created ${delta})`)
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log(`\nCreated: ${created}  Skipped: ${skipped}  Total accounted: ${created + skipped}`)
console.log(`Expected total: ${file.records.length}`)
if (created + skipped !== file.records.length) {
  console.error('ERROR: created + skipped does not equal staged count')
}

console.log('\n5 sample records (code, tags, reviewNote):')
for (const doc of sampleRecords) {
  const d = doc as any
  console.log(`  ${d?.code ?? '?'}  tags=${JSON.stringify(d?.tags ?? [])}  reviewNote=${JSON.stringify((d?.reviewNote ?? '').slice(0, 80))}`)
}

await pl.db?.destroy()
