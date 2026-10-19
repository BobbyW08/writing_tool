/**
 * scripts/migrate-legacy.ts
 *
 * Stage:  npx payload run scripts/migrate-legacy.ts
 * Apply:  npx payload run scripts/migrate-legacy.ts --apply
 *
 * Stage mode reads the old database (DATABASE_URL) and writes
 * staging/legacy.json and staging/legacy-review.md with every proposed
 * record. Nothing touches Payload or the new database.
 *
 * Apply mode creates the records via Payload Local API. It is idempotent:
 * each record carries legacyId and a second run updates, never duplicates.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import { slugify } from '../lib/codes'
import { LEGACY_TYPE_MAP } from '../lib/legacy'
import { RELATIONSHIP_TYPES } from '../lib/relationshipTypes'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT = path.join(__dirname, '..')
const STAGING_DIR = path.join(ROOT, 'staging')
const APPLY = process.argv.includes('--apply')

// ─── Helpers ────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error('FATAL:', msg)
  process.exit(1)
}

/** Parse headings from a markdown file and return clean name strings in order. */
function parseHeadings(content: string): string[] {
  return content
    .split('\n')
    .filter(l => /^#{1,4} /.test(l))
    .map(l => l.replace(/^#{1,4} /, '').replace(/\*\*/g, '').replace(/`/g, '').trim())
}

/** Convert plain text with optional markdown paragraphs to a Lexical EditorState. */
function textToLexical(text: string) {
  const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean)
  if (!paragraphs.length) return null
  return {
    root: {
      type: 'root',
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
      children: paragraphs.map(p => ({
        type: 'paragraph',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        textFormat: 0,
        textStyle: '',
        children: [{
          type: 'text',
          version: 1,
          text: p,
          mode: 'normal',
          format: 0,
          detail: 0,
          style: '',
        }],
      })),
    },
  }
}

const WIKI_LINK_RE = /\[\[([A-Za-z]+)#([^\]|]+?)(?:\|([^\]]+?))?\]\]/g

interface WikiRewrite { original: string; resolved: string }
interface WikiResult {
  text: string
  rewrites: WikiRewrite[]
  unresolvable: string[]
}

/** Replace [[Type#Name|Label]] wiki-links with "Label (Code)" using the code map. */
function resolveWikiLinks(text: string, codeBySlug: Map<string, string>): WikiResult {
  const rewrites: WikiRewrite[] = []
  const unresolvable: string[] = []
  const result = text.replace(WIKI_LINK_RE, (match, _type, name, label) => {
    const display = (label ?? name).trim()
    const code = codeBySlug.get(slugify(name.trim()))
    if (code) {
      const resolved = `${display} (${code})`
      rewrites.push({ original: match, resolved })
      return resolved
    }
    unresolvable.push(match)
    return display
  })
  return { text: result, rewrites, unresolvable }
}

/** Map an old relationship label to a new relationship type value. */
function mapRelType(label: string): { type: string; unk: boolean } {
  const l = label.toLowerCase().trim()
  if (l === 'wife' || l === 'husband') return { type: 'spouse_of', unk: false }
  // All other labels need review
  return { type: 'related_to', unk: true }
}

// ─── Old-DB types ────────────────────────────────────────────────────────────

interface OldEntity {
  id: string
  type: string
  name: string
  slug: string
  status: string
  gap_prompt: string | null
  source_doc_id: string
  parent_entity_id: string | null
}

interface OldEvent {
  id: string
  title: string
  slug: string
  year_label: string | null
  sort_order: string
  location_id: string | null
  what_happened: string | null
  why_it_happened: string | null
  what_it_caused: string | null
  what_was_learned: string | null
  draft_text: string | null
  source_doc_id: string
  parent_event_id: string | null
}

interface OldEventLink {
  event_id: string
  entity_id: string
  role: string | null
}

interface OldRelationship {
  entity_id_a: string
  entity_id_b: string
  label: string
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!process.env.DATABASE_URL) fail('DATABASE_URL is not set')
  if (!process.env.PAYLOAD_DATABASE_URL) fail('PAYLOAD_DATABASE_URL is not set')

  // Extract just the host portion so we never print the full connection string
  const oldHost = new URL(process.env.DATABASE_URL.replace(/^postgres(ql)?:\/\//, 'https://')).hostname
  const newHost = new URL(process.env.PAYLOAD_DATABASE_URL.replace(/^postgres(ql)?:\/\//, 'https://')).hostname
  if (oldHost === newHost) fail(`Old and new database hosts are the same (${oldHost}). Refusing to run.`)
  console.log('Old DB host:', oldHost)
  console.log('New DB host:', newHost)

  // ── Connect to old database (read-only) ──────────────────────────────────
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL })
  await db.connect()

  // ── Read source files for entity ordering ──────────────────────────────
  const charsContent = fs.readFileSync(path.join(ROOT, 'source-docs/canonical/Characters.md'), 'utf8')
  const locsContent = fs.readFileSync(path.join(ROOT, 'source-docs/canonical/Locations.md'), 'utf8')
  const charHeadings = parseHeadings(charsContent)
  const locHeadings = parseHeadings(locsContent)

  // ── Query old database ──────────────────────────────────────────────────
  const entitiesRes = await db.query<OldEntity>(`
    SELECT id, type, name, slug, status, gap_prompt, source_doc_id, parent_entity_id
    FROM entities ORDER BY source_doc_id, name
  `)
  const entities = entitiesRes.rows

  const eventsRes = await db.query<OldEvent>(`
    SELECT id, title, slug, year_label, sort_order, location_id,
           what_happened, why_it_happened, what_it_caused, what_was_learned,
           draft_text, source_doc_id, parent_event_id
    FROM events
    ORDER BY
      CASE source_doc_id WHEN 'canonical/Events.md' THEN 0 ELSE 1 END,
      sort_order::numeric
  `)
  const events = eventsRes.rows

  const linksRes = await db.query<OldEventLink>(`
    SELECT event_id, entity_id, role FROM event_links
  `)
  const eventLinks = linksRes.rows

  const relsRes = await db.query<OldRelationship>(`
    SELECT entity_id_a, entity_id_b, label FROM relationships
  `)
  const relationships = relsRes.rows

  await db.end()

  console.log(`\nRead from old DB: ${entities.length} entities, ${events.length} events, ${eventLinks.length} event_links, ${relationships.length} relationships`)
  if (entities.length !== 47) console.warn('WARNING: expected 47 entities, got', entities.length)
  if (events.length !== 113) console.warn('WARNING: expected 113 events, got', events.length)
  if (eventLinks.length !== 38) console.warn('WARNING: expected 38 event_links, got', eventLinks.length)
  if (relationships.length !== 4) console.warn('WARNING: expected 4 relationships, got', relationships.length)

  // ── Order entities by source document ──────────────────────────────────
  function orderBySourceDoc(docEntities: OldEntity[], headings: string[]): OldEntity[] {
    const bySlug = new Map(docEntities.map(e => [e.slug, e]))
    const byNameSlug = new Map(docEntities.map(e => [slugify(e.name), e]))
    const ordered: OldEntity[] = []
    const seen = new Set<string>()
    for (const h of headings) {
      const e = bySlug.get(slugify(h)) ?? byNameSlug.get(slugify(h))
      if (e && !seen.has(e.id)) {
        ordered.push(e)
        seen.add(e.id)
      }
    }
    // Any not matched by heading order go at the end
    for (const e of docEntities) {
      if (!seen.has(e.id)) {
        console.warn(`  WARNING: entity "${e.name}" not matched to heading order, appended`)
        ordered.push(e)
        seen.add(e.id)
      }
    }
    return ordered
  }

  const charEntities = entities.filter(e => e.source_doc_id === 'canonical/Characters.md')
  const locEntities = entities.filter(e => e.source_doc_id === 'canonical/Locations.md')
  const otherEntities = entities.filter(e =>
    e.source_doc_id !== 'canonical/Characters.md' &&
    e.source_doc_id !== 'canonical/Locations.md'
  )

  const orderedChars = orderBySourceDoc(charEntities, charHeadings)
  const orderedLocs = orderBySourceDoc(locEntities, locHeadings)

  // ── Build code maps ─────────────────────────────────────────────────────
  // Map: legacyId (UUID) -> proposed code
  // Map: slug -> proposed code (for wiki-link resolution)
  const codeByLegacyId = new Map<string, string>()
  const codeBySlug = new Map<string, string>()
  let charN = 1, locN = 1, evtN = 1, relN = 1

  for (const e of orderedChars) {
    const code = `C${charN++}`
    codeByLegacyId.set(e.id, code)
    codeBySlug.set(e.slug, code)
    codeBySlug.set(slugify(e.name), code)
  }
  for (const e of orderedLocs) {
    const code = `L${locN++}`
    codeByLegacyId.set(e.id, code)
    codeBySlug.set(e.slug, code)
    codeBySlug.set(slugify(e.name), code)
  }
  for (const e of otherEntities) {
    const mapping = LEGACY_TYPE_MAP[e.type]
    if (!mapping) { console.warn(`Unknown type "${e.type}" for entity "${e.name}", skipping`); continue }
    const prefix = { characters: 'C', locations: 'L', items: 'I', cultures: 'U', races: 'R', languages: 'G' }[mapping.collection] ?? 'C'
    const n = prefix === 'C' ? charN++ : prefix === 'L' ? locN++ : 1
    const code = `${prefix}${n}`
    codeByLegacyId.set(e.id, code)
    codeBySlug.set(e.slug, code)
  }
  for (const ev of events) {
    codeByLegacyId.set(ev.id, `E${evtN++}`)
  }

  // ── Build legacy code map (legacyId -> { code, name, collection }) ──────
  const legacyCodeMap: Record<string, { code: string; name: string; collection: string }> = {}

  for (const e of [...orderedChars, ...orderedLocs, ...otherEntities]) {
    const code = codeByLegacyId.get(e.id)!
    const mapping = LEGACY_TYPE_MAP[e.type]
    if (!mapping) continue
    legacyCodeMap[e.id] = { code, name: e.name, collection: mapping.collection }
  }
  for (const ev of events) {
    const code = codeByLegacyId.get(ev.id)!
    legacyCodeMap[ev.id] = { code, name: ev.title, collection: 'events' }
  }

  // ── Build event-link index ───────────────────────────────────────────────
  const linksByEvent = new Map<string, OldEventLink[]>()
  for (const link of eventLinks) {
    const arr = linksByEvent.get(link.event_id) ?? []
    arr.push(link)
    linksByEvent.set(link.event_id, arr)
  }

  // ── Staging records ─────────────────────────────────────────────────────
  interface StagedEntity {
    collection: string
    proposed_code: string
    legacyId: string
    name: string
    slug: string
    status: string
    gapPrompt: string | null
    source_doc_id: string
    unk: boolean
    reviewNote: string | null
  }

  interface StagedEvent {
    collection: 'events'
    proposed_code: string
    legacyId: string
    name: string
    slug: string
    status: string
    yearLabel: string | null
    startYear: number | null
    sortOrder: number | null
    location_proposed_code: string | null
    involves: Array<{ proposed_code: string; collection: string }>
    whatHappened: string | null
    whyItHappened: string | null
    whatItCaused: string | null
    whatWasLearned: string | null
    draftText: string | null
    draftText_rewrites: WikiRewrite[]
    unk: boolean
    reviewNote: string | null
    unresolvable_links: string[]
  }

  interface StagedRelationship {
    collection: 'relationships'
    proposed_code: string
    legacyId_a: string
    legacyId_b: string
    from_proposed_code: string
    from_collection: string
    to_proposed_code: string
    to_collection: string
    old_label: string
    type: string
    unk: boolean
    reviewNote: string | null
  }

  const stagedEntities: StagedEntity[] = []
  const stagedEvents: StagedEvent[] = []
  const stagedRelationships: StagedRelationship[] = []

  // Entities
  for (const e of [...orderedChars, ...orderedLocs, ...otherEntities]) {
    const mapping = LEGACY_TYPE_MAP[e.type]
    if (!mapping) continue
    const code = codeByLegacyId.get(e.id)!
    stagedEntities.push({
      collection: mapping.collection,
      proposed_code: code,
      legacyId: e.id,
      name: e.name,
      slug: e.slug,
      status: e.status,
      gapPrompt: e.gap_prompt,
      source_doc_id: e.source_doc_id,
      unk: false,
      reviewNote: null,
    })
  }

  // Events
  let wikiRewriteCount = 0
  let unresolvableCount = 0

  for (const ev of events) {
    const code = codeByLegacyId.get(ev.id)!
    const locCode = ev.location_id ? codeByLegacyId.get(ev.location_id) ?? null : null
    const links = linksByEvent.get(ev.id) ?? []

    const involves = links.map(l => {
      const entCode = codeByLegacyId.get(l.entity_id)
      const entInfo = legacyCodeMap[l.entity_id]
      return entCode && entInfo ? { proposed_code: entCode, collection: entInfo.collection, role: l.role } : null
    }).filter((x): x is NonNullable<typeof x> => x !== null)

    // Resolve wiki-links in all plain-text fields and in draftText
    function resolveField(text: string | null): { text: string | null; rewrites: WikiRewrite[]; unresolvable: string[] } {
      if (!text) return { text, rewrites: [], unresolvable: [] }
      const r = resolveWikiLinks(text, codeBySlug)
      return { text: r.text, rewrites: r.rewrites, unresolvable: r.unresolvable }
    }
    const whRes = resolveField(ev.what_happened)
    const wiRes = resolveField(ev.why_it_happened)
    const wcRes = resolveField(ev.what_it_caused)
    const wlRes = resolveField(ev.what_was_learned)
    const dtRes = resolveField(ev.draft_text)

    const allRewrites: WikiRewrite[] = [...whRes.rewrites, ...wiRes.rewrites, ...wcRes.rewrites, ...wlRes.rewrites, ...dtRes.rewrites]
    const allUnresolvable: string[] = [...whRes.unresolvable, ...wiRes.unresolvable, ...wcRes.unresolvable, ...wlRes.unresolvable, ...dtRes.unresolvable]
    wikiRewriteCount += allRewrites.length
    unresolvableCount += allUnresolvable.length

    const sortRaw = ev.sort_order
    const sortNum = (sortRaw == null || sortRaw === '') ? null : Number(sortRaw)
    const yearUnknown = sortNum === null || sortNum < 0
    const startYear = yearUnknown ? null : Math.round(sortNum)

    const unk = allRewrites.length > 0 || allUnresolvable.length > 0 || yearUnknown
    const parts: string[] = []
    if (allRewrites.length) parts.push(`Wiki-links rewritten: ${allRewrites.map(r => `${r.original} -> ${r.resolved}`).join('; ')}`)
    if (allUnresolvable.length) parts.push(`Unresolvable links left as plain text: ${allUnresolvable.join(', ')}`)
    if (yearUnknown) parts.push(`Year unknown: old sort_order was ${sortRaw == null ? 'null' : `'${sortRaw}'`}`)

    stagedEvents.push({
      collection: 'events',
      proposed_code: code,
      legacyId: ev.id,
      name: ev.title,
      slug: ev.slug,
      status: 'locked',
      yearLabel: ev.year_label,
      startYear,
      sortOrder: startYear,
      location_proposed_code: locCode,
      involves,
      whatHappened: whRes.text,
      whyItHappened: wiRes.text,
      whatItCaused: wcRes.text,
      whatWasLearned: wlRes.text,
      draftText: dtRes.text,
      draftText_rewrites: allRewrites,
      unk,
      reviewNote: parts.length ? parts.join(' | ') : null,
      unresolvable_links: allUnresolvable,
    })
  }

  // Relationships
  for (const rel of relationships) {
    const code = `X${relN++}`
    const fromCode = codeByLegacyId.get(rel.entity_id_a)
    const toCode = codeByLegacyId.get(rel.entity_id_b)
    const fromInfo = legacyCodeMap[rel.entity_id_a]
    const toInfo = legacyCodeMap[rel.entity_id_b]

    if (!fromCode || !toCode || !fromInfo || !toInfo) {
      console.warn(`Could not resolve both ends of relationship "${rel.label}" (${rel.entity_id_a} <-> ${rel.entity_id_b}), skipping`)
      continue
    }

    const { type, unk: typeUnk } = mapRelType(rel.label)
    const fromLabel = `${fromCode} (${fromInfo.name})`
    const toLabel = `${toCode} (${toInfo.name})`
    const note = typeUnk
      ? `Old label was "${rel.label}". Mapped to related_to; review and set the correct type. From: ${fromLabel}, To: ${toLabel}`
      : `Migrated from old DB label "${rel.label}". From: ${fromLabel}, To: ${toLabel}`

    stagedRelationships.push({
      collection: 'relationships',
      proposed_code: code,
      legacyId_a: rel.entity_id_a,
      legacyId_b: rel.entity_id_b,
      from_proposed_code: fromCode,
      from_collection: fromInfo.collection,
      to_proposed_code: toCode,
      to_collection: toInfo.collection,
      old_label: rel.label,
      type,
      unk: true,
      reviewNote: note,
    })
  }

  // ── Write staging files ─────────────────────────────────────────────────
  if (!fs.existsSync(STAGING_DIR)) fs.mkdirSync(STAGING_DIR, { recursive: true })

  const stagingData = {
    meta: {
      generated_at: new Date().toISOString(),
      old_db_host: oldHost,
      new_db_host: newHost,
    },
    code_map: Object.fromEntries(
      Object.entries(legacyCodeMap).map(([id, v]) => [v.code, { legacyId: id, name: v.name, collection: v.collection }])
    ),
    records: {
      entities: stagedEntities,
      events: stagedEvents,
      relationships: stagedRelationships,
    },
    stats: {
      characters: stagedEntities.filter(e => e.collection === 'characters').length,
      locations: stagedEntities.filter(e => e.collection === 'locations').length,
      events: stagedEvents.length,
      relationships: stagedRelationships.length,
      event_links_total: eventLinks.length,
      events_with_wiki_rewrites: stagedEvents.filter(e => e.draftText_rewrites.length > 0).length,
      wiki_links_rewritten: wikiRewriteCount,
      unresolvable_wiki_links: unresolvableCount,
    },
  }

  fs.writeFileSync(
    path.join(STAGING_DIR, 'legacy.json'),
    JSON.stringify(stagingData, null, 2)
  )
  console.log('\nWrote staging/legacy.json')

  // ── Write review report ─────────────────────────────────────────────────
  const report = buildReviewReport(stagingData, stagedEntities, stagedEvents, stagedRelationships)
  fs.writeFileSync(path.join(STAGING_DIR, 'legacy-review.md'), report)
  console.log('Wrote staging/legacy-review.md')

  // ── Write legacy code map ───────────────────────────────────────────────
  fs.writeFileSync(
    path.join(STAGING_DIR, 'legacy-code-map.json'),
    JSON.stringify(stagingData.code_map, null, 2)
  )
  console.log('Wrote staging/legacy-code-map.json')

  console.log('\n--- Staging summary ---')
  console.log(`  Characters:  ${stagingData.stats.characters}`)
  console.log(`  Locations:   ${stagingData.stats.locations}`)
  console.log(`  Events:      ${stagingData.stats.events}`)
  console.log(`  Relationships: ${stagingData.stats.relationships}`)
  console.log(`  Event links: ${stagingData.stats.event_links_total}`)
  console.log(`  Wiki rewrites: ${stagingData.stats.wiki_links_rewritten}`)
  console.log(`  Unresolvable: ${stagingData.stats.unresolvable_wiki_links}`)

  if (APPLY) {
    console.log('\n--- Apply mode ---')
    await applyRecords(stagedEntities, stagedEvents, stagedRelationships, legacyCodeMap)
  } else {
    console.log('\nStaging complete. Review staging/legacy-review.md, then run with --apply.')
  }
}

// ─── Review report builder ────────────────────────────────────────────────

function buildReviewReport(
  data: ReturnType<typeof JSON.parse>,
  entities: Array<{ collection: string; proposed_code: string; name: string; status: string; gapPrompt: string | null; unk: boolean; reviewNote: string | null }>,
  events: Array<{ proposed_code: string; name: string; yearLabel: string | null; startYear: number | null; involves: Array<{ proposed_code: string }>; draftText_rewrites: WikiRewrite[]; unresolvable_links: string[]; unk: boolean }>,
  relationships: Array<{ proposed_code: string; from_proposed_code: string; to_proposed_code: string; old_label: string; type: string; unk: boolean; reviewNote: string | null }>
): string {
  const lines: string[] = []
  const { stats } = data

  lines.push('# Legacy migration staging review')
  lines.push('')
  lines.push(`Generated: ${data.meta.generated_at}`)
  lines.push('')
  lines.push('## Summary')
  lines.push('')
  lines.push(`| Collection | Count | UNK |`)
  lines.push(`|---|---|---|`)
  lines.push(`| characters | ${stats.characters} | 0 |`)
  lines.push(`| locations | ${stats.locations} | 0 |`)
  lines.push(`| events | ${stats.events} | ${stats.events_with_wiki_rewrites} |`)
  lines.push(`| relationships | ${stats.relationships} | ${stats.relationships} (all flagged for type review) |`)
  lines.push('')
  lines.push(`Event links migrated to involves: ${stats.event_links_total}`)
  lines.push(`Wiki-links rewritten: ${stats.wiki_links_rewritten} across ${stats.events_with_wiki_rewrites} events`)
  lines.push(`Unresolvable wiki-links (left as plain text): ${stats.unresolvable_wiki_links}`)
  lines.push('')
  lines.push('No cultures, races, languages, items, or factions in the old database (all expected).')
  lines.push('')

  // Character list with codes
  lines.push('## Characters (C1 to C' + stats.characters + ') -- source-document order')
  lines.push('')
  const chars = entities.filter(e => e.collection === 'characters')
  for (const c of chars) {
    const gap = c.gapPrompt ? ` | gap: "${c.gapPrompt}"` : ''
    lines.push(`- ${c.proposed_code}: **${c.name}** (${c.status})${gap}`)
  }
  lines.push('')

  // Location list with codes
  lines.push('## Locations (L1 to L' + stats.locations + ') -- source-document order')
  lines.push('')
  const locs = entities.filter(e => e.collection === 'locations')
  for (const l of locs) {
    lines.push(`- ${l.proposed_code}: **${l.name}** (${l.status})`)
  }
  lines.push('')

  // Events: first 10 and last 5 of Events.md, first 5 of Timeline.md
  lines.push('## Events (E1 to E' + stats.events + ')')
  lines.push('')
  lines.push('First 10 from Events.md:')
  for (const ev of events.slice(0, 10)) {
    const inv = ev.involves.map(i => i.proposed_code).join(', ')
    lines.push(`- ${ev.proposed_code}: **${ev.name}** (year=${ev.startYear}, label="${ev.yearLabel ?? ''}") involves: ${inv || 'none'}`)
  }
  lines.push('')
  lines.push('Last 5 from Events.md (E34-E38):')
  for (const ev of events.slice(33, 38)) {
    const inv = ev.involves.map(i => i.proposed_code).join(', ')
    lines.push(`- ${ev.proposed_code}: **${ev.name}** (year=${ev.startYear}, label="${ev.yearLabel ?? ''}") involves: ${inv || 'none'}`)
  }
  lines.push('')
  lines.push('First 5 from Timeline.md (E39-E43):')
  for (const ev of events.slice(38, 43)) {
    const inv = ev.involves.map(i => i.proposed_code).join(', ')
    lines.push(`- ${ev.proposed_code}: **${ev.name}** (year=${ev.startYear}, label="${ev.yearLabel ?? ''}") involves: ${inv || 'none'}`)
  }
  lines.push('')

  // Wiki-link rewrites
  lines.push('## Wiki-link rewrites')
  lines.push('')
  const withRewrites = events.filter(ev => ev.draftText_rewrites.length > 0)
  if (withRewrites.length === 0) {
    lines.push('No wiki-links found in event text fields.')
  } else {
    for (const ev of withRewrites) {
      lines.push(`### ${ev.proposed_code}: ${ev.name}`)
      for (const r of ev.draftText_rewrites) {
        lines.push(`- \`${r.original}\` => \`${r.resolved}\``)
      }
    }
  }
  lines.push('')
  const withUnresolvable = events.filter(ev => ev.unresolvable_links.length > 0)
  if (withUnresolvable.length > 0) {
    lines.push('## Unresolvable wiki-links (left as plain text)')
    lines.push('')
    for (const ev of withUnresolvable) {
      lines.push(`- ${ev.proposed_code} ${ev.name}: ${ev.unresolvable_links.join(', ')}`)
    }
    lines.push('')
  }

  // Relationships
  lines.push('## Relationships (X1 to X' + stats.relationships + ')')
  lines.push('')
  lines.push('All 4 relationships are tagged UNK for type review.')
  lines.push('')
  for (const r of relationships) {
    lines.push(`- ${r.proposed_code}: ${r.from_proposed_code} **${r.type}** ${r.to_proposed_code} (old label: "${r.old_label}")`)
    if (r.reviewNote) lines.push(`  Note: ${r.reviewNote}`)
  }
  lines.push('')

  // Entities with gapPrompt
  const withGap = entities.filter(e => e.gapPrompt)
  if (withGap.length > 0) {
    lines.push('## Entities with gap prompts')
    lines.push('')
    for (const e of withGap) {
      lines.push(`- ${e.proposed_code} ${e.name}: "${e.gapPrompt}"`)
    }
    lines.push('')
  }

  lines.push('## What to check')
  lines.push('')
  lines.push('1. C1 = "SERO -- THE TRAVELER". Confirm this is correct.')
  lines.push('2. L1 = "CALDOR". Confirm location ordering.')
  lines.push('3. E1 = first event from Events.md by sort_order. Confirm this is "The Ritual".')
  lines.push('4. Review relationship types -- all 4 are UNK, set the correct type for each.')
  lines.push('5. Review any wiki-link rewrites and unresolvable links above.')
  lines.push('6. startYear comes from sort_order (the old sort position/year value). Check any that look wrong.')
  lines.push('7. The 3 event_links with role="location" are included in involves alongside the dedicated location field.')
  lines.push('   Review whether these should instead only be in the location field.')

  return lines.join('\n')
}

// ─── Apply ────────────────────────────────────────────────────────────────

async function applyRecords(
  stagedEntities: Array<{
    collection: string; proposed_code: string; legacyId: string; name: string;
    slug: string; status: string; source_doc_id: string; gapPrompt: string | null;
    unk: boolean; reviewNote: string | null
  }>,
  stagedEvents: Array<{
    proposed_code: string; legacyId: string; name: string; slug: string; status: string;
    yearLabel: string | null; startYear: number | null; sortOrder: number | null;
    location_proposed_code: string | null;
    involves: Array<{ proposed_code: string; collection: string }>;
    whatHappened: string | null; whyItHappened: string | null; whatItCaused: string | null;
    whatWasLearned: string | null; draftText: string | null;
    unk: boolean; reviewNote: string | null
  }>,
  stagedRelationships: Array<{
    proposed_code: string; legacyId_a: string; legacyId_b: string;
    from_proposed_code: string; from_collection: string;
    to_proposed_code: string; to_collection: string;
    old_label: string; type: string; unk: boolean; reviewNote: string | null
  }>,
  legacyCodeMap: Record<string, { code: string; name: string; collection: string }>
) {
  const { getPayload } = await import('payload')
  const { default: config } = await import('@payload-config')
  const payload = await getPayload({ config })
  // Payload's Local API generics are too strict for a migration script that
  // uses collection names as strings. This escape hatch keeps the runtime
  // behaviour identical while silencing TS2322 / TS2339 on .find/.create/.update.
  const pl = payload as any

  // Verify counters are at 1 for all prefixes except T
  const ctrs = await pl.find({ collection: 'counters', limit: 50, depth: 0 })
  const advanced = ctrs.docs.filter((c: { prefix: string; next: number }) => c.prefix !== 'T' && c.next !== 1)
  if (advanced.length > 0) {
    console.warn(`  WARN: counters already advanced (${advanced.map((c: { prefix: string; next: number }) => `${c.prefix}=${c.next}`).join(', ')}) -- resuming idempotent run`)
  } else {
    console.log('Counters verified: all at 1 except T')
  }

  // Get UNK tag ID
  const unkTagResult = await pl.find({ collection: 'tags', where: { name: { equals: 'UNK' } }, limit: 1, depth: 0 })
  const unkTagId = unkTagResult.docs[0]?.id
  if (!unkTagId) fail('UNK tag not found. Run the server first to create it via onInit.')
  console.log('UNK tag id:', unkTagId)

  // Map: proposed_code -> Payload numeric id (built as we create records)
  const payloadIdByCode = new Map<string, number | string>()
  // Map: legacyId -> Payload numeric id
  const payloadIdByLegacy = new Map<string, number | string>()

  // ── Create entities ──────────────────────────────────────────────────────
  console.log('\nCreating entities...')
  for (const ent of stagedEntities) {
    const existing = await pl.find({
      collection: ent.collection,
      where: { legacyId: { equals: ent.legacyId } },
      limit: 1,
      depth: 0,
    })

    const data: Record<string, unknown> = {
      code: ent.proposed_code,
      name: ent.name,
      slug: ent.slug,
      status: ent.status,
      legacyId: ent.legacyId,
      sourceDocId: ent.source_doc_id,
      ...(ent.gapPrompt ? { gapPrompt: ent.gapPrompt } : {}),
      ...(ent.reviewNote ? { reviewNote: ent.reviewNote } : {}),
      ...(ent.unk && unkTagId ? { tags: [unkTagId] } : {}),
    }

    let doc: { id: number | string; code: string }
    if (existing.docs.length > 0) {
      doc = await pl.update({ collection: ent.collection, id: existing.docs[0].id, data })
      process.stdout.write(`  U ${ent.proposed_code} ${ent.name}\n`)
    } else {
      doc = await pl.create({ collection: ent.collection, data })
      process.stdout.write(`  + ${ent.proposed_code} ${ent.name}\n`)
    }

    if (doc.code !== ent.proposed_code) {
      console.warn(`  WARNING: expected ${ent.proposed_code} but got ${doc.code} for "${ent.name}"`)
    }
    payloadIdByCode.set(ent.proposed_code, doc.id)
    payloadIdByLegacy.set(ent.legacyId, doc.id)
  }

  // ── Create events ────────────────────────────────────────────────────────
  console.log('\nCreating events...')
  for (const ev of stagedEvents) {
    const existing = await pl.find({
      collection: 'events',
      where: { legacyId: { equals: ev.legacyId } },
      limit: 1,
      depth: 0,
    })

    const locationPayloadId = ev.location_proposed_code
      ? payloadIdByCode.get(ev.location_proposed_code)
      : undefined

    const involvesField = ev.involves
      .map(i => {
        const pid = payloadIdByCode.get(i.proposed_code)
        return pid ? { relationTo: i.collection, value: pid } : null
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)

    const data: Record<string, unknown> = {
      code: ev.proposed_code,
      name: ev.name,
      slug: ev.slug,
      status: ev.status,
      legacyId: ev.legacyId,
      yearLabel: ev.yearLabel,
      startYear: ev.startYear,
      sortOrder: ev.sortOrder,
      ...(locationPayloadId !== undefined ? { location: locationPayloadId } : {}),
      ...(involvesField.length > 0 ? { involves: involvesField } : {}),
      ...(ev.whatHappened ? { whatHappened: ev.whatHappened } : {}),
      ...(ev.whyItHappened ? { whyItHappened: ev.whyItHappened } : {}),
      ...(ev.whatItCaused ? { whatItCaused: ev.whatItCaused } : {}),
      ...(ev.whatWasLearned ? { whatWasLearned: ev.whatWasLearned } : {}),
      ...(ev.draftText ? { draftText: textToLexical(ev.draftText) } : {}),
      ...(ev.reviewNote ? { reviewNote: ev.reviewNote } : {}),
      ...(ev.unk && unkTagId ? { tags: [unkTagId] } : {}),
    }

    let doc: { id: number | string; code: string }
    if (existing.docs.length > 0) {
      doc = await pl.update({ collection: 'events', id: existing.docs[0].id, data })
    } else {
      doc = await pl.create({ collection: 'events', data })
    }

    if (doc.code !== ev.proposed_code) {
      console.warn(`  WARNING: expected ${ev.proposed_code} but got ${doc.code} for "${ev.name}"`)
    }
    payloadIdByCode.set(ev.proposed_code, doc.id)
    payloadIdByLegacy.set(ev.legacyId, doc.id)
  }
  console.log(`  Created/updated ${stagedEvents.length} events`)

  // ── Create relationships ──────────────────────────────────────────────────
  console.log('\nCreating relationships...')
  for (const rel of stagedRelationships) {
    const existing = await pl.find({
      collection: 'relationships',
      where: { code: { equals: rel.proposed_code } },
      limit: 1,
      depth: 0,
    })

    const fromId = payloadIdByCode.get(rel.from_proposed_code)
    const toId = payloadIdByCode.get(rel.to_proposed_code)

    if (!fromId || !toId) {
      console.warn(`  Could not find Payload IDs for ${rel.from_proposed_code} or ${rel.to_proposed_code}, skipping`)
      continue
    }

    const data: Record<string, unknown> = {
      code: rel.proposed_code,
      from: { relationTo: rel.from_collection, value: fromId },
      type: rel.type,
      to: { relationTo: rel.to_collection, value: toId },
      ...(rel.reviewNote ? { reviewNote: rel.reviewNote } : {}),
      ...(rel.unk && unkTagId ? { tags: [unkTagId] } : {}),
    }

    if (existing.docs.length > 0) {
      await pl.update({ collection: 'relationships', id: existing.docs[0].id, data })
      console.log(`  U ${rel.proposed_code}: ${rel.from_proposed_code} ${rel.type} ${rel.to_proposed_code}`)
    } else {
      await pl.create({ collection: 'relationships', data })
      console.log(`  + ${rel.proposed_code}: ${rel.from_proposed_code} ${rel.type} ${rel.to_proposed_code}`)
    }
  }

  // ── Verify counts ─────────────────────────────────────────────────────────
  console.log('\n--- Verification ---')
  const colls = ['characters', 'locations', 'events', 'relationships']
  for (const c of colls) {
    const r = await pl.find({ collection: c, limit: 1, depth: 0 })
    console.log(`  ${c}: ${r.totalDocs}`)
  }

  await pl.db?.destroy()
  console.log('\nDone.')
}

await main().catch(e => {
  console.error(e)
  process.exit(1)
})
