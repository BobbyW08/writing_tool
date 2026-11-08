/**
 * scripts/copy-from-payload.ts
 *
 * Reads PAYLOAD_DATABASE_URL (read only). With flag -apply, copies into APP_DATABASE_URL.
 * Dry run by default: counts rows per table and exits without writing anything.
 *
 * Preserves: codes, slugs, tags, UNK flag, reviewNote, parent links,
 * relationships, events, stories, writing. Converts Lexical JSON body to Markdown.
 *
 * Idempotent on code (ON CONFLICT (code) DO UPDATE).
 * Resets counters to highest copied code number plus one after apply.
 *
 * Run dry run:
 *   npx tsx --env-file=.env.local scripts/copy-from-payload.ts
 *
 * Run apply (Bobby must approve first):
 *   npx tsx --env-file=.env.local scripts/copy-from-payload.ts -apply
 */

import { neon } from '@neondatabase/serverless'
import { appDb } from '../db/index'
import * as schema from '../db/schema'
import { setCounterMinimum } from '../db/codes'
import { eq } from 'drizzle-orm'

const APPLY = process.argv.includes('-apply')

if (!process.env.PAYLOAD_DATABASE_URL) {
  console.error('PAYLOAD_DATABASE_URL is not set. Cannot read from Payload database.')
  process.exit(1)
}

// Read-only connection to Payload database.
// This script never writes to PAYLOAD_DATABASE_URL.
const p = neon(process.env.PAYLOAD_DATABASE_URL)

// ─── Lexical JSON -> Markdown (no server-only guard, safe in Node.js script) ──

async function lexicalToMd(lexicalJson: unknown): Promise<string> {
  if (!lexicalJson || typeof lexicalJson !== 'object') return ''
  try {
    const { createHeadlessEditor } = await import('@lexical/headless')
    const { HeadingNode, QuoteNode } = await import('@lexical/rich-text')
    const { ListNode, ListItemNode } = await import('@lexical/list')
    const { $convertToMarkdownString, TRANSFORMERS } = await import('@lexical/markdown')
    const editor = createHeadlessEditor({
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
      onError: () => {},
    })
    const state = editor.parseEditorState(JSON.stringify(lexicalJson))
    let md = ''
    state.read(() => { md = $convertToMarkdownString(TRANSFORMERS) })
    return md
  } catch {
    return ''
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  return isNaN(n) ? null : n
}

function str(v: unknown): string | null {
  if (v === null || v === undefined) return null
  return String(v)
}

function bool(v: unknown): boolean {
  return !!v
}

// Group rows by a numeric key field
function groupBy<T extends Row>(rows: T[], key: string): Map<number, T[]> {
  const m = new Map<number, T[]>()
  for (const r of rows) {
    const k = num(r[key])
    if (k === null) continue
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(r)
  }
  return m
}

// Extract numeric code suffix: "C12" -> 12
function codeNum(code: string | null | undefined): number | null {
  if (!code) return null
  const m = /(\d+)$/.exec(code)
  return m ? Number(m[1]) : null
}

// Derive collection name from code prefix
const PREFIX_TO_COLLECTION: Record<string, string> = {
  C: 'characters', L: 'locations', I: 'items', U: 'cultures',
  F: 'factions', R: 'races', G: 'languages', K: 'lore',
  E: 'events', S: 'stories', W: 'writing', X: 'relationships', T: 'tags',
}

function collectionFromCode(code: string | null | undefined): string | null {
  if (!code) return null
  const prefix = code.replace(/\d+$/, '')
  return PREFIX_TO_COLLECTION[prefix] ?? null
}

// ─── Dry run: count rows per table ────────────────────────────────────────────

async function countTable(label: string, query: () => Promise<Row[]>): Promise<number> {
  try {
    const rows = await query()
    const n = num((rows[0] as Row)?.n ?? (rows[0] as Row)?.count) ?? rows.length
    console.log(`  ${label.padEnd(22)} ${n}`)
    return n
  } catch (e) {
    console.log(`  ${label.padEnd(22)} ERROR: ${String(e).split('\n')[0]}`)
    return -1
  }
}

async function dryRun(): Promise<Record<string, number>> {
  console.log('=== copy-from-payload.ts DRY RUN ===')
  console.log('Reading from PAYLOAD_DATABASE_URL (no writes)\n')
  console.log('Table                  Count')
  console.log('---------------------- -----')

  const counts: Record<string, number> = {}

  counts.tags = await countTable('tags', () => p`SELECT COUNT(*) as n FROM tags`)
  counts.characters = await countTable('characters', () => p`SELECT COUNT(*) as n FROM characters`)
  counts.locations = await countTable('locations', () => p`SELECT COUNT(*) as n FROM locations`)
  counts.items = await countTable('items', () => p`SELECT COUNT(*) as n FROM items`)
  counts.cultures = await countTable('cultures', () => p`SELECT COUNT(*) as n FROM cultures`)
  counts.factions = await countTable('factions', () => p`SELECT COUNT(*) as n FROM factions`)
  counts.races = await countTable('races', () => p`SELECT COUNT(*) as n FROM races`)
  counts.languages = await countTable('languages', () => p`SELECT COUNT(*) as n FROM languages`)
  counts.lore = await countTable('lore', () => p`SELECT COUNT(*) as n FROM lore`)
  counts.events = await countTable('events', () => p`SELECT COUNT(*) as n FROM events`)
  counts.stories = await countTable('stories', () => p`SELECT COUNT(*) as n FROM stories`)
  counts.writing = await countTable('writing', () => p`SELECT COUNT(*) as n FROM writing`)
  counts.relationships = await countTable('relationships', () => p`SELECT COUNT(*) as n FROM relationships`)
  counts.media = await countTable('media', () => p`SELECT COUNT(*) as n FROM media`)

  console.log('\nJoin / array tables (rows with data):')
  const joinTables: Array<[string, () => Promise<Row[]>]> = [
    ['characters_aliases', () => p`SELECT COUNT(*) as n FROM characters_aliases`],
    ['characters_details', () => p`SELECT COUNT(*) as n FROM characters_details`],
    ['characters_rels', () => p`SELECT COUNT(*) as n FROM characters_rels`],
    ['locations_aliases', () => p`SELECT COUNT(*) as n FROM locations_aliases`],
    ['locations_details', () => p`SELECT COUNT(*) as n FROM locations_details`],
    ['locations_rels', () => p`SELECT COUNT(*) as n FROM locations_rels`],
    ['items_aliases', () => p`SELECT COUNT(*) as n FROM items_aliases`],
    ['items_details', () => p`SELECT COUNT(*) as n FROM items_details`],
    ['items_rels', () => p`SELECT COUNT(*) as n FROM items_rels`],
    ['cultures_aliases', () => p`SELECT COUNT(*) as n FROM cultures_aliases`],
    ['cultures_details', () => p`SELECT COUNT(*) as n FROM cultures_details`],
    ['cultures_rels', () => p`SELECT COUNT(*) as n FROM cultures_rels`],
    ['factions_aliases', () => p`SELECT COUNT(*) as n FROM factions_aliases`],
    ['factions_details', () => p`SELECT COUNT(*) as n FROM factions_details`],
    ['factions_rels', () => p`SELECT COUNT(*) as n FROM factions_rels`],
    ['races_aliases', () => p`SELECT COUNT(*) as n FROM races_aliases`],
    ['races_details', () => p`SELECT COUNT(*) as n FROM races_details`],
    ['races_rels', () => p`SELECT COUNT(*) as n FROM races_rels`],
    ['languages_aliases', () => p`SELECT COUNT(*) as n FROM languages_aliases`],
    ['languages_details', () => p`SELECT COUNT(*) as n FROM languages_details`],
    ['languages_rels', () => p`SELECT COUNT(*) as n FROM languages_rels`],
    ['lore_aliases', () => p`SELECT COUNT(*) as n FROM lore_aliases`],
    ['lore_details', () => p`SELECT COUNT(*) as n FROM lore_details`],
    ['lore_rels', () => p`SELECT COUNT(*) as n FROM lore_rels`],
    ['events_aliases', () => p`SELECT COUNT(*) as n FROM events_aliases`],
    ['events_details', () => p`SELECT COUNT(*) as n FROM events_details`],
    ['events_rels', () => p`SELECT COUNT(*) as n FROM events_rels`],
    ['stories_aliases', () => p`SELECT COUNT(*) as n FROM stories_aliases`],
    ['stories_details', () => p`SELECT COUNT(*) as n FROM stories_details`],
    ['stories_beats', () => p`SELECT COUNT(*) as n FROM stories_beats`],
    ['stories_rels', () => p`SELECT COUNT(*) as n FROM stories_rels`],
    ['writing_rels', () => p`SELECT COUNT(*) as n FROM writing_rels`],
    ['relationships_rels', () => p`SELECT COUNT(*) as n FROM relationships_rels`],
  ]
  for (const [label, query] of joinTables) {
    try {
      const rows = await query()
      const n = num((rows[0] as Row)?.n) ?? 0
      if (n > 0) {
        console.log(`  ${label.padEnd(22)} ${n}`)
        counts[label] = n
      }
    } catch {
      // Table may not exist if that collection has no data
    }
  }

  console.log('\n=== Dry run complete. No data was written. ===')
  return counts
}

// ─── Apply: copy tags ─────────────────────────────────────────────────────────

async function copyTags(): Promise<Map<number, number>> {
  console.log('\nCopying tags...')
  const rows = await p`SELECT id, code, name, description FROM tags ORDER BY id`
  const idMap = new Map<number, number>()

  for (const r of rows as Row[]) {
    const code = str(r.code)
    const name = str(r.name)
    if (!code || !name) continue

    const [inserted] = await appDb.insert(schema.tags)
      .values({
        code,
        name,
        description: str(r.description),
        builtIn: name === 'UNK' || name === 'AI suggested',
      })
      .onConflictDoUpdate({
        target: schema.tags.code,
        set: { name, description: str(r.description) },
      })
      .returning({ id: schema.tags.id })

    idMap.set(num(r.id)!, inserted.id)
  }

  console.log(`  Copied ${idMap.size} tags`)
  return idMap
}

// ─── Apply: read shared world entity data from Payload ────────────────────────

interface PayloadAliasRow { _parent_id: unknown; alias: unknown }
interface PayloadDetailRow { _parent_id: unknown; label: unknown; value: unknown; in_infobox: unknown }
interface PayloadRelRow { parent_id: unknown; tags_id?: unknown; locations_id?: unknown; languages_id?: unknown }

function buildAliasMap(rows: PayloadAliasRow[]): Map<number, { alias: string }[]> {
  const m = new Map<number, { alias: string }[]>()
  for (const r of rows) {
    const pid = num(r._parent_id)
    const alias = str(r.alias)
    if (pid === null || !alias) continue
    if (!m.has(pid)) m.set(pid, [])
    m.get(pid)!.push({ alias })
  }
  return m
}

function buildDetailMap(rows: PayloadDetailRow[]): Map<number, { label: string; value: string; inInfobox: boolean }[]> {
  const m = new Map<number, { label: string; value: string; inInfobox: boolean }[]>()
  for (const r of rows) {
    const pid = num(r._parent_id)
    const label = str(r.label)
    if (pid === null || !label) continue
    if (!m.has(pid)) m.set(pid, [])
    m.get(pid)!.push({ label, value: str(r.value) ?? '', inInfobox: bool(r.in_infobox) })
  }
  return m
}

function buildTagMap(rows: PayloadRelRow[], tagIdMap: Map<number, number>): Map<number, number[]> {
  const m = new Map<number, number[]>()
  for (const r of rows) {
    const pid = num(r.parent_id)
    const tid = num(r.tags_id)
    if (pid === null || tid === null) continue
    const newTid = tagIdMap.get(tid)
    if (newTid === undefined) continue
    if (!m.has(pid)) m.set(pid, [])
    m.get(pid)!.push(newTid)
  }
  return m
}

// ─── Apply: copy world entities (characters, locations, etc.) ─────────────────

async function copyCharacters(tagIdMap: Map<number, number>): Promise<Map<number, number>> {
  console.log('\nCopying characters...')
  const rows = await p`
    SELECT id, code, slug, name, summary, status, gap_prompt, review_note,
           source_doc_id, legacy_id, body, parent_id, image_id,
           role, birth_year, death_year, birthplace_id, race_id, culture_id,
           updated_at, created_at
    FROM characters ORDER BY id`
  const aliases = await p`SELECT _parent_id, alias FROM characters_aliases ORDER BY _parent_id, _order`
  const details = await p`SELECT _parent_id, label, value, in_infobox FROM characters_details ORDER BY _parent_id, _order`
  const tagRels = await p`SELECT parent_id, tags_id FROM characters_rels WHERE path = 'tags' ORDER BY parent_id`

  const aliasMap = buildAliasMap(aliases as PayloadAliasRow[])
  const detailMap = buildDetailMap(details as PayloadDetailRow[])
  const tagMap = buildTagMap(tagRels as PayloadRelRow[], tagIdMap)
  const idMap = new Map<number, number>()

  for (const r of rows as Row[]) {
    const code = str(r.code)
    const slug = str(r.slug)
    const name = str(r.name)
    if (!code || !slug || !name) continue

    const pid = num(r.id)!
    const body = await lexicalToMd(r.body)
    const [inserted] = await appDb.insert(schema.characters)
      .values({
        code,
        slug,
        name,
        summary: str(r.summary),
        status: str(r.status) ?? 'in_development',
        gapPrompt: str(r.gap_prompt),
        reviewNote: str(r.review_note),
        sourceDocId: str(r.source_doc_id),
        legacyId: str(r.legacy_id),
        body: body || null,
        aliases: aliasMap.get(pid) ?? [],
        details: detailMap.get(pid) ?? [],
        tagIds: tagMap.get(pid) ?? [],
        role: str(r.role),
        birthYear: num(r.birth_year),
        deathYear: num(r.death_year),
        // FK IDs set in second pass after all world entities are copied
        parentId: null,
        birthplaceId: null,
        raceId: null,
        cultureId: null,
        imageId: null,
      })
      .onConflictDoUpdate({
        target: schema.characters.code,
        set: {
          name, summary: str(r.summary), status: str(r.status) ?? 'in_development',
          gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
          body: body || null, aliases: aliasMap.get(pid) ?? [],
          details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
          role: str(r.role), birthYear: num(r.birth_year), deathYear: num(r.death_year),
        },
      })
      .returning({ id: schema.characters.id })

    idMap.set(pid, inserted.id)
  }

  console.log(`  Copied ${idMap.size} characters`)
  return idMap
}

async function copyLocations(tagIdMap: Map<number, number>): Promise<Map<number, number>> {
  console.log('\nCopying locations...')
  const rows = await p`
    SELECT id, code, slug, name, summary, status, gap_prompt, review_note,
           source_doc_id, legacy_id, body, parent_id, image_id,
           kind, culture_id, updated_at, created_at
    FROM locations ORDER BY id`
  const aliases = await p`SELECT _parent_id, alias FROM locations_aliases ORDER BY _parent_id, _order`
  const details = await p`SELECT _parent_id, label, value, in_infobox FROM locations_details ORDER BY _parent_id, _order`
  const tagRels = await p`SELECT parent_id, tags_id FROM locations_rels WHERE path = 'tags' ORDER BY parent_id`

  const aliasMap = buildAliasMap(aliases as PayloadAliasRow[])
  const detailMap = buildDetailMap(details as PayloadDetailRow[])
  const tagMap = buildTagMap(tagRels as PayloadRelRow[], tagIdMap)
  const idMap = new Map<number, number>()

  for (const r of rows as Row[]) {
    const code = str(r.code); const slug = str(r.slug); const name = str(r.name)
    if (!code || !slug || !name) continue
    const pid = num(r.id)!
    const body = await lexicalToMd(r.body)
    const [inserted] = await appDb.insert(schema.locations)
      .values({
        code, slug, name, summary: str(r.summary),
        status: str(r.status) ?? 'in_development',
        gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
        sourceDocId: str(r.source_doc_id), legacyId: str(r.legacy_id),
        body: body || null, aliases: aliasMap.get(pid) ?? [],
        details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
        kind: str(r.kind), parentId: null, cultureId: null, imageId: null,
      })
      .onConflictDoUpdate({
        target: schema.locations.code,
        set: {
          name, summary: str(r.summary), status: str(r.status) ?? 'in_development',
          gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
          body: body || null, aliases: aliasMap.get(pid) ?? [],
          details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
          kind: str(r.kind),
        },
      })
      .returning({ id: schema.locations.id })
    idMap.set(pid, inserted.id)
  }
  console.log(`  Copied ${idMap.size} locations`)
  return idMap
}

async function copyItems(tagIdMap: Map<number, number>): Promise<Map<number, number>> {
  console.log('\nCopying items...')
  const rows = await p`
    SELECT id, code, slug, name, summary, status, gap_prompt, review_note,
           source_doc_id, legacy_id, body, parent_id, image_id,
           item_type, created_year, current_owner_id, current_location_id,
           updated_at, created_at
    FROM items ORDER BY id`
  const aliases = await p`SELECT _parent_id, alias FROM items_aliases ORDER BY _parent_id, _order`
  const details = await p`SELECT _parent_id, label, value, in_infobox FROM items_details ORDER BY _parent_id, _order`
  const tagRels = await p`SELECT parent_id, tags_id FROM items_rels WHERE path = 'tags' ORDER BY parent_id`

  const aliasMap = buildAliasMap(aliases as PayloadAliasRow[])
  const detailMap = buildDetailMap(details as PayloadDetailRow[])
  const tagMap = buildTagMap(tagRels as PayloadRelRow[], tagIdMap)
  const idMap = new Map<number, number>()

  for (const r of rows as Row[]) {
    const code = str(r.code); const slug = str(r.slug); const name = str(r.name)
    if (!code || !slug || !name) continue
    const pid = num(r.id)!
    const body = await lexicalToMd(r.body)
    const [inserted] = await appDb.insert(schema.items)
      .values({
        code, slug, name, summary: str(r.summary),
        status: str(r.status) ?? 'in_development',
        gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
        sourceDocId: str(r.source_doc_id), legacyId: str(r.legacy_id),
        body: body || null, aliases: aliasMap.get(pid) ?? [],
        details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
        itemType: str(r.item_type), createdYear: num(r.created_year),
        parentId: null, currentOwnerId: null, currentLocationId: null, imageId: null,
      })
      .onConflictDoUpdate({
        target: schema.items.code,
        set: {
          name, summary: str(r.summary), status: str(r.status) ?? 'in_development',
          gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
          body: body || null, aliases: aliasMap.get(pid) ?? [],
          details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
          itemType: str(r.item_type), createdYear: num(r.created_year),
        },
      })
      .returning({ id: schema.items.id })
    idMap.set(pid, inserted.id)
  }
  console.log(`  Copied ${idMap.size} items`)
  return idMap
}

async function copyCultures(tagIdMap: Map<number, number>): Promise<Map<number, number>> {
  console.log('\nCopying cultures...')
  const rows = await p`
    SELECT id, code, slug, name, summary, status, gap_prompt, review_note,
           source_doc_id, legacy_id, body, parent_id, image_id,
           founded_year, ended_year, updated_at, created_at
    FROM cultures ORDER BY id`
  const aliases = await p`SELECT _parent_id, alias FROM cultures_aliases ORDER BY _parent_id, _order`
  const details = await p`SELECT _parent_id, label, value, in_infobox FROM cultures_details ORDER BY _parent_id, _order`
  const tagRels = await p`SELECT parent_id, tags_id, locations_id, languages_id FROM cultures_rels ORDER BY parent_id`

  const aliasMap = buildAliasMap(aliases as PayloadAliasRow[])
  const detailMap = buildDetailMap(details as PayloadDetailRow[])
  // Tags: path='tags'
  const tagOnlyRels = (tagRels as Row[]).filter(r => r.tags_id !== null && r.tags_id !== undefined)
  const tagMap = buildTagMap(tagOnlyRels as unknown as PayloadRelRow[], tagIdMap)
  // Homelands: path='homelands', locations_id
  const homelandRelsMap = new Map<number, number[]>()
  for (const r of tagRels as Row[]) {
    if (r.locations_id === null || r.locations_id === undefined) continue
    const pid = num(r.parent_id); const lid = num(r.locations_id)
    if (pid === null || lid === null) continue
    if (!homelandRelsMap.has(pid)) homelandRelsMap.set(pid, [])
    homelandRelsMap.get(pid)!.push(lid)
  }
  // Languages: path='languages', languages_id
  const langRelsMap = new Map<number, number[]>()
  for (const r of tagRels as Row[]) {
    if (r.languages_id === null || r.languages_id === undefined) continue
    const pid = num(r.parent_id); const lid = num(r.languages_id)
    if (pid === null || lid === null) continue
    if (!langRelsMap.has(pid)) langRelsMap.set(pid, [])
    langRelsMap.get(pid)!.push(lid)
  }
  const idMap = new Map<number, number>()

  for (const r of rows as Row[]) {
    const code = str(r.code); const slug = str(r.slug); const name = str(r.name)
    if (!code || !slug || !name) continue
    const pid = num(r.id)!
    const body = await lexicalToMd(r.body)
    // homelandIds and cultureLanguageIds store Payload IDs now; FK pass will remap to new IDs
    const [inserted] = await appDb.insert(schema.cultures)
      .values({
        code, slug, name, summary: str(r.summary),
        status: str(r.status) ?? 'in_development',
        gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
        sourceDocId: str(r.source_doc_id), legacyId: str(r.legacy_id),
        body: body || null, aliases: aliasMap.get(pid) ?? [],
        details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
        foundedYear: num(r.founded_year), endedYear: num(r.ended_year),
        parentId: null, imageId: null,
        homelandIds: homelandRelsMap.get(pid) ?? [],
        cultureLanguageIds: langRelsMap.get(pid) ?? [],
      })
      .onConflictDoUpdate({
        target: schema.cultures.code,
        set: {
          name, summary: str(r.summary), status: str(r.status) ?? 'in_development',
          gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
          body: body || null, aliases: aliasMap.get(pid) ?? [],
          details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
          foundedYear: num(r.founded_year), endedYear: num(r.ended_year),
          homelandIds: homelandRelsMap.get(pid) ?? [],
          cultureLanguageIds: langRelsMap.get(pid) ?? [],
        },
      })
      .returning({ id: schema.cultures.id })
    idMap.set(pid, inserted.id)
  }
  console.log(`  Copied ${idMap.size} cultures`)
  return idMap
}

async function copyFactions(tagIdMap: Map<number, number>): Promise<Map<number, number>> {
  console.log('\nCopying factions...')
  const rows = await p`
    SELECT id, code, slug, name, summary, status, gap_prompt, review_note,
           source_doc_id, legacy_id, body, parent_id, image_id,
           kind, culture_id, founded_year, ended_year, updated_at, created_at
    FROM factions ORDER BY id`
  const aliases = await p`SELECT _parent_id, alias FROM factions_aliases ORDER BY _parent_id, _order`
  const details = await p`SELECT _parent_id, label, value, in_infobox FROM factions_details ORDER BY _parent_id, _order`
  const tagRels = await p`SELECT parent_id, tags_id FROM factions_rels WHERE path = 'tags' ORDER BY parent_id`

  const aliasMap = buildAliasMap(aliases as PayloadAliasRow[])
  const detailMap = buildDetailMap(details as PayloadDetailRow[])
  const tagMap = buildTagMap(tagRels as PayloadRelRow[], tagIdMap)
  const idMap = new Map<number, number>()

  for (const r of rows as Row[]) {
    const code = str(r.code); const slug = str(r.slug); const name = str(r.name)
    if (!code || !slug || !name) continue
    const pid = num(r.id)!
    const body = await lexicalToMd(r.body)
    const [inserted] = await appDb.insert(schema.factions)
      .values({
        code, slug, name, summary: str(r.summary),
        status: str(r.status) ?? 'in_development',
        gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
        sourceDocId: str(r.source_doc_id), legacyId: str(r.legacy_id),
        body: body || null, aliases: aliasMap.get(pid) ?? [],
        details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
        kind: str(r.kind), foundedYear: num(r.founded_year), endedYear: num(r.ended_year),
        parentId: null, cultureId: null, imageId: null,
      })
      .onConflictDoUpdate({
        target: schema.factions.code,
        set: {
          name, summary: str(r.summary), status: str(r.status) ?? 'in_development',
          gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
          body: body || null, aliases: aliasMap.get(pid) ?? [],
          details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
          kind: str(r.kind), foundedYear: num(r.founded_year), endedYear: num(r.ended_year),
        },
      })
      .returning({ id: schema.factions.id })
    idMap.set(pid, inserted.id)
  }
  console.log(`  Copied ${idMap.size} factions`)
  return idMap
}

async function copyRaces(tagIdMap: Map<number, number>): Promise<Map<number, number>> {
  console.log('\nCopying races...')
  const rows = await p`
    SELECT id, code, slug, name, summary, status, gap_prompt, review_note,
           source_doc_id, legacy_id, body, parent_id, image_id,
           updated_at, created_at
    FROM races ORDER BY id`
  const aliases = await p`SELECT _parent_id, alias FROM races_aliases ORDER BY _parent_id, _order`
  const details = await p`SELECT _parent_id, label, value, in_infobox FROM races_details ORDER BY _parent_id, _order`
  const tagRels = await p`SELECT parent_id, tags_id FROM races_rels WHERE path = 'tags' ORDER BY parent_id`

  const aliasMap = buildAliasMap(aliases as PayloadAliasRow[])
  const detailMap = buildDetailMap(details as PayloadDetailRow[])
  const tagMap = buildTagMap(tagRels as PayloadRelRow[], tagIdMap)
  const idMap = new Map<number, number>()

  for (const r of rows as Row[]) {
    const code = str(r.code); const slug = str(r.slug); const name = str(r.name)
    if (!code || !slug || !name) continue
    const pid = num(r.id)!
    const body = await lexicalToMd(r.body)
    const [inserted] = await appDb.insert(schema.races)
      .values({
        code, slug, name, summary: str(r.summary),
        status: str(r.status) ?? 'in_development',
        gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
        sourceDocId: str(r.source_doc_id), legacyId: str(r.legacy_id),
        body: body || null, aliases: aliasMap.get(pid) ?? [],
        details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
        parentId: null, imageId: null,
      })
      .onConflictDoUpdate({
        target: schema.races.code,
        set: {
          name, summary: str(r.summary), status: str(r.status) ?? 'in_development',
          gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
          body: body || null, aliases: aliasMap.get(pid) ?? [],
          details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
        },
      })
      .returning({ id: schema.races.id })
    idMap.set(pid, inserted.id)
  }
  console.log(`  Copied ${idMap.size} races`)
  return idMap
}

async function copyLanguages(tagIdMap: Map<number, number>): Promise<Map<number, number>> {
  console.log('\nCopying languages...')
  const rows = await p`
    SELECT id, code, slug, name, summary, status, gap_prompt, review_note,
           source_doc_id, legacy_id, body, parent_id, image_id,
           updated_at, created_at
    FROM languages ORDER BY id`
  const aliases = await p`SELECT _parent_id, alias FROM languages_aliases ORDER BY _parent_id, _order`
  const details = await p`SELECT _parent_id, label, value, in_infobox FROM languages_details ORDER BY _parent_id, _order`
  const tagRels = await p`SELECT parent_id, tags_id FROM languages_rels WHERE path = 'tags' ORDER BY parent_id`

  const aliasMap = buildAliasMap(aliases as PayloadAliasRow[])
  const detailMap = buildDetailMap(details as PayloadDetailRow[])
  const tagMap = buildTagMap(tagRels as PayloadRelRow[], tagIdMap)
  const idMap = new Map<number, number>()

  for (const r of rows as Row[]) {
    const code = str(r.code); const slug = str(r.slug); const name = str(r.name)
    if (!code || !slug || !name) continue
    const pid = num(r.id)!
    const body = await lexicalToMd(r.body)
    const [inserted] = await appDb.insert(schema.languages)
      .values({
        code, slug, name, summary: str(r.summary),
        status: str(r.status) ?? 'in_development',
        gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
        sourceDocId: str(r.source_doc_id), legacyId: str(r.legacy_id),
        body: body || null, aliases: aliasMap.get(pid) ?? [],
        details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
        parentId: null, imageId: null,
      })
      .onConflictDoUpdate({
        target: schema.languages.code,
        set: {
          name, summary: str(r.summary), status: str(r.status) ?? 'in_development',
          gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
          body: body || null, aliases: aliasMap.get(pid) ?? [],
          details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
        },
      })
      .returning({ id: schema.languages.id })
    idMap.set(pid, inserted.id)
  }
  console.log(`  Copied ${idMap.size} languages`)
  return idMap
}

async function copyLore(tagIdMap: Map<number, number>): Promise<Map<number, number>> {
  console.log('\nCopying lore...')
  const rows = await p`
    SELECT id, code, slug, name, summary, status, gap_prompt, review_note,
           source_doc_id, legacy_id, body, parent_id, image_id,
           category, updated_at, created_at
    FROM lore ORDER BY id`
  const aliases = await p`SELECT _parent_id, alias FROM lore_aliases ORDER BY _parent_id, _order`
  const details = await p`SELECT _parent_id, label, value, in_infobox FROM lore_details ORDER BY _parent_id, _order`
  const tagRels = await p`SELECT parent_id, tags_id FROM lore_rels WHERE path = 'tags' ORDER BY parent_id`

  const aliasMap = buildAliasMap(aliases as PayloadAliasRow[])
  const detailMap = buildDetailMap(details as PayloadDetailRow[])
  const tagMap = buildTagMap(tagRels as PayloadRelRow[], tagIdMap)
  const idMap = new Map<number, number>()

  for (const r of rows as Row[]) {
    const code = str(r.code); const slug = str(r.slug); const name = str(r.name)
    if (!code || !slug || !name) continue
    const pid = num(r.id)!
    const body = await lexicalToMd(r.body)
    const [inserted] = await appDb.insert(schema.lore)
      .values({
        code, slug, name, summary: str(r.summary),
        status: str(r.status) ?? 'in_development',
        gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
        sourceDocId: str(r.source_doc_id), legacyId: str(r.legacy_id),
        body: body || null, aliases: aliasMap.get(pid) ?? [],
        details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
        category: str(r.category), parentId: null, imageId: null,
      })
      .onConflictDoUpdate({
        target: schema.lore.code,
        set: {
          name, summary: str(r.summary), status: str(r.status) ?? 'in_development',
          gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
          body: body || null, aliases: aliasMap.get(pid) ?? [],
          details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
          category: str(r.category),
        },
      })
      .returning({ id: schema.lore.id })
    idMap.set(pid, inserted.id)
  }
  console.log(`  Copied ${idMap.size} lore entries`)
  return idMap
}

// ─── Apply: second pass - update FK IDs for world entities ────────────────────

type WorldIdMaps = {
  characters: Map<number, number>
  locations: Map<number, number>
  items: Map<number, number>
  cultures: Map<number, number>
  factions: Map<number, number>
  races: Map<number, number>
  languages: Map<number, number>
  lore: Map<number, number>
}

async function fixWorldFKs(idMaps: WorldIdMaps): Promise<void> {
  console.log('\nSecond pass: fixing FK IDs for world entities...')

  // Characters: birthplaceId, raceId, cultureId, parentId
  const charRows = await p`SELECT id, birthplace_id, race_id, culture_id, parent_id FROM characters`
  for (const r of charRows as Row[]) {
    const oldId = num(r.id)!
    const newId = idMaps.characters.get(oldId)
    if (!newId) continue
    const bpNew = r.birthplace_id ? idMaps.locations.get(num(r.birthplace_id)!) : null
    const raceNew = r.race_id ? idMaps.races.get(num(r.race_id)!) : null
    const cultNew = r.culture_id ? idMaps.cultures.get(num(r.culture_id)!) : null
    const parentNew = r.parent_id ? idMaps.characters.get(num(r.parent_id)!) : null
    if (bpNew || raceNew || cultNew || parentNew) {
      await appDb.update(schema.characters)
        .set({ birthplaceId: bpNew ?? undefined, raceId: raceNew ?? undefined, cultureId: cultNew ?? undefined, parentId: parentNew ?? undefined })
        .where(eq(schema.characters.id, newId))
    }
  }

  // Locations: cultureId, parentId
  const locRows = await p`SELECT id, culture_id, parent_id FROM locations`
  for (const r of locRows as Row[]) {
    const oldId = num(r.id)!
    const newId = idMaps.locations.get(oldId)
    if (!newId) continue
    const cultNew = r.culture_id ? idMaps.cultures.get(num(r.culture_id)!) : null
    const parentNew = r.parent_id ? idMaps.locations.get(num(r.parent_id)!) : null
    if (cultNew || parentNew) {
      await appDb.update(schema.locations)
        .set({ cultureId: cultNew ?? undefined, parentId: parentNew ?? undefined })
        .where(eq(schema.locations.id, newId))
    }
  }

  // Items: currentOwnerId, currentLocationId, parentId
  const itemRows = await p`SELECT id, current_owner_id, current_location_id, parent_id FROM items`
  for (const r of itemRows as Row[]) {
    const oldId = num(r.id)!
    const newId = idMaps.items.get(oldId)
    if (!newId) continue
    const ownerNew = r.current_owner_id ? idMaps.characters.get(num(r.current_owner_id)!) : null
    const locNew = r.current_location_id ? idMaps.locations.get(num(r.current_location_id)!) : null
    const parentNew = r.parent_id ? idMaps.items.get(num(r.parent_id)!) : null
    if (ownerNew || locNew || parentNew) {
      await appDb.update(schema.items)
        .set({ currentOwnerId: ownerNew ?? undefined, currentLocationId: locNew ?? undefined, parentId: parentNew ?? undefined })
        .where(eq(schema.items.id, newId))
    }
  }

  // Cultures: homelandIds, cultureLanguageIds -> remap from Payload IDs to new IDs, parentId
  const cultRows = await appDb.select({ id: schema.cultures.id, homelandIds: schema.cultures.homelandIds, cultureLanguageIds: schema.cultures.cultureLanguageIds }).from(schema.cultures)
  // Also get parentId from Payload
  const cultPayloadRows = await p`SELECT id, parent_id FROM cultures`
  for (const r of cultPayloadRows as Row[]) {
    const oldId = num(r.id)!
    const newId = idMaps.cultures.get(oldId)
    if (!newId) continue
    const parentNew = r.parent_id ? idMaps.cultures.get(num(r.parent_id)!) : null
    if (parentNew) {
      await appDb.update(schema.cultures).set({ parentId: parentNew }).where(eq(schema.cultures.id, newId))
    }
  }
  // Remap homeland and language IDs stored as Payload IDs
  for (const c of cultRows) {
    const remappedHomelands = (c.homelandIds ?? []).map(pid => idMaps.locations.get(pid)).filter(Boolean) as number[]
    const remappedLangs = (c.cultureLanguageIds ?? []).map(pid => idMaps.languages.get(pid)).filter(Boolean) as number[]
    await appDb.update(schema.cultures)
      .set({ homelandIds: remappedHomelands, cultureLanguageIds: remappedLangs })
      .where(eq(schema.cultures.id, c.id))
  }

  // Factions: cultureId, parentId
  const facRows = await p`SELECT id, culture_id, parent_id FROM factions`
  for (const r of facRows as Row[]) {
    const oldId = num(r.id)!
    const newId = idMaps.factions.get(oldId)
    if (!newId) continue
    const cultNew = r.culture_id ? idMaps.cultures.get(num(r.culture_id)!) : null
    const parentNew = r.parent_id ? idMaps.factions.get(num(r.parent_id)!) : null
    if (cultNew || parentNew) {
      await appDb.update(schema.factions)
        .set({ cultureId: cultNew ?? undefined, parentId: parentNew ?? undefined })
        .where(eq(schema.factions.id, newId))
    }
  }

  // Races, Languages, Lore: parentId only
  const [racePayloadRows, langPayloadRows, lorePayloadRows] = await Promise.all([
    p`SELECT id, parent_id FROM races`,
    p`SELECT id, parent_id FROM languages`,
    p`SELECT id, parent_id FROM lore`,
  ])
  for (const r of racePayloadRows as Row[]) {
    const newId = idMaps.races.get(num(r.id)!)
    if (!newId || !r.parent_id) continue
    const parentNew = idMaps.races.get(num(r.parent_id)!)
    if (parentNew) await appDb.update(schema.races).set({ parentId: parentNew }).where(eq(schema.races.id, newId))
  }
  for (const r of langPayloadRows as Row[]) {
    const newId = idMaps.languages.get(num(r.id)!)
    if (!newId || !r.parent_id) continue
    const parentNew = idMaps.languages.get(num(r.parent_id)!)
    if (parentNew) await appDb.update(schema.languages).set({ parentId: parentNew }).where(eq(schema.languages.id, newId))
  }
  for (const r of lorePayloadRows as Row[]) {
    const newId = idMaps.lore.get(num(r.id)!)
    if (!newId || !r.parent_id) continue
    const parentNew = idMaps.lore.get(num(r.parent_id)!)
    if (parentNew) await appDb.update(schema.lore).set({ parentId: parentNew }).where(eq(schema.lore.id, newId))
  }

  console.log('  FK IDs updated.')
}

// ─── Apply: copy events ────────────────────────────────────────────────────────

async function copyEvents(tagIdMap: Map<number, number>, idMaps: WorldIdMaps): Promise<Map<number, number>> {
  console.log('\nCopying events...')
  const rows = await p`
    SELECT id, code, slug, name, summary, status, gap_prompt, review_note,
           source_doc_id, legacy_id, body, parent_id, image_id,
           start_year, end_year, year_label, sort_order, location_id,
           what_happened, why_it_happened, what_it_caused, what_was_learned,
           draft_text, updated_at, created_at
    FROM events ORDER BY id`
  const aliases = await p`SELECT _parent_id, alias FROM events_aliases ORDER BY _parent_id, _order`
  const details = await p`SELECT _parent_id, label, value, in_infobox FROM events_details ORDER BY _parent_id, _order`
  const tagRels = await p`SELECT parent_id, tags_id FROM events_rels WHERE path = 'tags' ORDER BY parent_id`
  // involves: polymorphic - each row has one non-null collection_id column
  const involvesRels = await p`
    SELECT parent_id, characters_id, locations_id, items_id,
           cultures_id, factions_id, races_id, languages_id, lore_id
    FROM events_rels WHERE path = 'involves' ORDER BY parent_id, "order"`

  const aliasMap = buildAliasMap(aliases as PayloadAliasRow[])
  const detailMap = buildDetailMap(details as PayloadDetailRow[])
  const tagMap = buildTagMap(tagRels as PayloadRelRow[], tagIdMap)
  const idMap = new Map<number, number>()

  for (const r of rows as Row[]) {
    const code = str(r.code); const slug = str(r.slug); const name = str(r.name)
    if (!code || !slug || !name) continue
    const pid = num(r.id)!
    // Events use draftText for richText, not body. Both are stored as JSONB.
    const body = await lexicalToMd(r.draft_text ?? r.body)
    const locNew = r.location_id ? idMaps.locations.get(num(r.location_id)!) : null

    const [inserted] = await appDb.insert(schema.events)
      .values({
        code, slug, name, summary: str(r.summary),
        status: str(r.status) ?? 'in_development',
        gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
        sourceDocId: str(r.source_doc_id), legacyId: str(r.legacy_id),
        body: body || null,
        details: detailMap.get(pid) ?? [], tagIds: tagMap.get(pid) ?? [],
        startYear: num(r.start_year), endYear: num(r.end_year),
        yearLabel: str(r.year_label), sortOrder: num(r.sort_order) ?? 0,
        locationId: locNew ?? null, parentId: null, imageId: null,
        whatHappened: str(r.what_happened), whyItHappened: str(r.why_it_happened),
        whatItCaused: str(r.what_it_caused), whatWasLearned: str(r.what_was_learned),
      })
      .onConflictDoUpdate({
        target: schema.events.code,
        set: {
          name, summary: str(r.summary), status: str(r.status) ?? 'in_development',
          gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
          body: body || null, details: detailMap.get(pid) ?? [],
          tagIds: tagMap.get(pid) ?? [],
          startYear: num(r.start_year), endYear: num(r.end_year),
          yearLabel: str(r.year_label), sortOrder: num(r.sort_order) ?? 0,
          locationId: locNew ?? null,
          whatHappened: str(r.what_happened), whyItHappened: str(r.why_it_happened),
          whatItCaused: str(r.what_it_caused), whatWasLearned: str(r.what_was_learned),
        },
      })
      .returning({ id: schema.events.id })
    idMap.set(pid, inserted.id)
  }

  // Insert event_involves join rows
  const INVOLVES_COLS: Array<[string, keyof WorldIdMaps]> = [
    ['characters_id', 'characters'], ['locations_id', 'locations'], ['items_id', 'items'],
    ['cultures_id', 'cultures'], ['factions_id', 'factions'], ['races_id', 'races'],
    ['languages_id', 'languages'], ['lore_id', 'lore'],
  ]
  let involvesCount = 0
  for (const r of involvesRels as Row[]) {
    const eventPid = num(r.parent_id)
    const newEventId = eventPid !== null ? idMap.get(eventPid) : null
    if (!newEventId) continue
    for (const [col, collection] of INVOLVES_COLS) {
      const entryPid = num(r[col])
      if (entryPid === null) continue
      const newEntryId = idMaps[collection].get(entryPid)
      if (!newEntryId) continue
      await appDb.insert(schema.eventInvolves)
        .values({ eventId: newEventId, entryCollection: collection, entryId: newEntryId })
        .onConflictDoNothing()
      involvesCount++
    }
  }

  console.log(`  Copied ${idMap.size} events, ${involvesCount} involves links`)
  return idMap
}

// ─── Apply: copy stories ──────────────────────────────────────────────────────

async function copyStories(tagIdMap: Map<number, number>, idMaps: WorldIdMaps, eventIdMap: Map<number, number>): Promise<Map<number, number>> {
  console.log('\nCopying stories...')
  const rows = await p`
    SELECT id, code, slug, name, summary, status, gap_prompt, review_note,
           source_doc_id, legacy_id, parent_id, image_id,
           stage, format, era, start_year, end_year, year_label,
           floating, catalog_number, updated_at, created_at
    FROM stories ORDER BY id`
  const tagRels = await p`SELECT parent_id, tags_id FROM stories_rels WHERE path = 'tags' ORDER BY parent_id`
  const involvesRels = await p`
    SELECT parent_id, characters_id, locations_id, items_id,
           cultures_id, factions_id, races_id, languages_id, lore_id
    FROM stories_rels WHERE path = 'involves' ORDER BY parent_id, "order"`
  const dramatizesRels = await p`SELECT parent_id, events_id FROM stories_rels WHERE path = 'dramatizes' ORDER BY parent_id, "order"`

  const tagMap = buildTagMap(tagRels as PayloadRelRow[], tagIdMap)
  const idMap = new Map<number, number>()

  for (const r of rows as Row[]) {
    const code = str(r.code); const slug = str(r.slug); const name = str(r.name)
    if (!code || !slug || !name) continue
    const pid = num(r.id)!
    const [inserted] = await appDb.insert(schema.stories)
      .values({
        code, slug, name, summary: str(r.summary),
        status: str(r.status) ?? 'in_development',
        gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
        sourceDocId: str(r.source_doc_id), legacyId: str(r.legacy_id),
        tagIds: tagMap.get(pid) ?? [],
        stage: str(r.stage) ?? 'idea', format: str(r.format), era: str(r.era),
        startYear: num(r.start_year), endYear: num(r.end_year),
        yearLabel: str(r.year_label), floating: bool(r.floating),
        catalogNumber: num(r.catalog_number), imageId: null, body: null,
      })
      .onConflictDoUpdate({
        target: schema.stories.code,
        set: {
          name, summary: str(r.summary), status: str(r.status) ?? 'in_development',
          gapPrompt: str(r.gap_prompt), reviewNote: str(r.review_note),
          tagIds: tagMap.get(pid) ?? [],
          stage: str(r.stage) ?? 'idea', format: str(r.format), era: str(r.era),
          startYear: num(r.start_year), endYear: num(r.end_year),
          yearLabel: str(r.year_label), floating: bool(r.floating),
          catalogNumber: num(r.catalog_number),
        },
      })
      .returning({ id: schema.stories.id })
    idMap.set(pid, inserted.id)
  }

  // story_involves
  const INVOLVES_COLS: Array<[string, keyof WorldIdMaps]> = [
    ['characters_id', 'characters'], ['locations_id', 'locations'], ['items_id', 'items'],
    ['cultures_id', 'cultures'], ['factions_id', 'factions'], ['races_id', 'races'],
    ['languages_id', 'languages'], ['lore_id', 'lore'],
  ]
  let involvesCount = 0
  for (const r of involvesRels as Row[]) {
    const storyPid = num(r.parent_id)
    const newStoryId = storyPid !== null ? idMap.get(storyPid) : null
    if (!newStoryId) continue
    for (const [col, collection] of INVOLVES_COLS) {
      const entryPid = num(r[col])
      if (entryPid === null) continue
      const newEntryId = idMaps[collection].get(entryPid)
      if (!newEntryId) continue
      await appDb.insert(schema.storyInvolves)
        .values({ storyId: newStoryId, entryCollection: collection, entryId: newEntryId })
        .onConflictDoNothing()
      involvesCount++
    }
  }

  // story_dramatizes
  let dramatizesCount = 0
  for (const r of dramatizesRels as Row[]) {
    const storyPid = num(r.parent_id)
    const newStoryId = storyPid !== null ? idMap.get(storyPid) : null
    const evPid = num((r as Row).events_id)
    const newEvId = evPid !== null ? eventIdMap.get(evPid) : null
    if (!newStoryId || !newEvId) continue
    await appDb.insert(schema.storyDramatizes)
      .values({ storyId: newStoryId, eventId: newEvId })
      .onConflictDoNothing()
    dramatizesCount++
  }

  console.log(`  Copied ${idMap.size} stories, ${involvesCount} involves, ${dramatizesCount} dramatizes links`)
  return idMap
}

// ─── Apply: copy writing ──────────────────────────────────────────────────────

async function copyWriting(tagIdMap: Map<number, number>, storyIdMap: Map<number, number>, idMaps: WorldIdMaps): Promise<Map<number, number>> {
  console.log('\nCopying writing...')
  const rows = await p`
    SELECT id, code, slug, name, review_note, source_doc_id, legacy_id,
           canon_state, kind, story_id, "order", start_year,
           text, plain_text, check_status,
           updated_at, created_at
    FROM writing ORDER BY id`
  const tagRels = await p`SELECT parent_id, tags_id FROM writing_rels WHERE path = 'tags' ORDER BY parent_id`
  const mentionRels = await p`
    SELECT parent_id, characters_id, locations_id, items_id,
           cultures_id, factions_id, races_id, languages_id, lore_id
    FROM writing_rels WHERE path = 'mentions' ORDER BY parent_id, "order"`

  const tagMap = buildTagMap(tagRels as PayloadRelRow[], tagIdMap)
  const idMap = new Map<number, number>()

  for (const r of rows as Row[]) {
    const code = str(r.code); const slug = str(r.slug); const name = str(r.name)
    if (!code || !slug || !name) continue
    const pid = num(r.id)!
    const textMd = await lexicalToMd(r.text)
    const storyPid = num(r.story_id)
    const newStoryId = storyPid !== null ? storyIdMap.get(storyPid) : null
    const [inserted] = await appDb.insert(schema.writing)
      .values({
        code, slug, name,
        reviewNote: str(r.review_note), sourceDocId: str(r.source_doc_id), legacyId: str(r.legacy_id),
        tagIds: tagMap.get(pid) ?? [],
        canonState: str(r.canon_state) ?? 'draft',
        kind: str(r.kind) ?? 'snippet',
        storyId: newStoryId ?? null,
        order: num(r.order) ?? 0,
        startYear: num(r.start_year),
        text: textMd || null,
        plainText: str(r.plain_text),
        checkStatus: str(r.check_status) ?? 'unchecked',
      })
      .onConflictDoUpdate({
        target: schema.writing.code,
        set: {
          name, reviewNote: str(r.review_note), tagIds: tagMap.get(pid) ?? [],
          canonState: str(r.canon_state) ?? 'draft', kind: str(r.kind) ?? 'snippet',
          storyId: newStoryId ?? null, order: num(r.order) ?? 0,
          startYear: num(r.start_year), text: textMd || null, plainText: str(r.plain_text),
          checkStatus: str(r.check_status) ?? 'unchecked',
        },
      })
      .returning({ id: schema.writing.id })
    idMap.set(pid, inserted.id)
  }

  // writing_mentions
  const MENTION_COLS: Array<[string, keyof WorldIdMaps]> = [
    ['characters_id', 'characters'], ['locations_id', 'locations'], ['items_id', 'items'],
    ['cultures_id', 'cultures'], ['factions_id', 'factions'], ['races_id', 'races'],
    ['languages_id', 'languages'], ['lore_id', 'lore'],
  ]
  let mentionCount = 0
  for (const r of mentionRels as Row[]) {
    const writingPid = num(r.parent_id)
    const newWritingId = writingPid !== null ? idMap.get(writingPid) : null
    if (!newWritingId) continue
    for (const [col, collection] of MENTION_COLS) {
      const entryPid = num(r[col])
      if (entryPid === null) continue
      const newEntryId = idMaps[collection].get(entryPid)
      if (!newEntryId) continue
      await appDb.insert(schema.writingMentions)
        .values({ writingId: newWritingId, entryCollection: collection, entryId: newEntryId })
        .onConflictDoNothing()
      mentionCount++
    }
  }

  console.log(`  Copied ${idMap.size} writing records, ${mentionCount} mention links`)
  return idMap
}

// ─── Apply: build code -> new-ID lookup for relationships ────────────────────

async function buildAllCodeMaps(): Promise<Map<string, { collection: string; id: number }>> {
  const out = new Map<string, { collection: string; id: number }>()

  function addRows(collection: string, rows: { id: number; code: string | null }[]) {
    for (const r of rows) if (r.code) out.set(r.code, { collection, id: r.id })
  }

  addRows('characters', await appDb.select({ id: schema.characters.id, code: schema.characters.code }).from(schema.characters))
  addRows('locations', await appDb.select({ id: schema.locations.id, code: schema.locations.code }).from(schema.locations))
  addRows('items', await appDb.select({ id: schema.items.id, code: schema.items.code }).from(schema.items))
  addRows('cultures', await appDb.select({ id: schema.cultures.id, code: schema.cultures.code }).from(schema.cultures))
  addRows('factions', await appDb.select({ id: schema.factions.id, code: schema.factions.code }).from(schema.factions))
  addRows('races', await appDb.select({ id: schema.races.id, code: schema.races.code }).from(schema.races))
  addRows('languages', await appDb.select({ id: schema.languages.id, code: schema.languages.code }).from(schema.languages))
  addRows('lore', await appDb.select({ id: schema.lore.id, code: schema.lore.code }).from(schema.lore))
  addRows('events', await appDb.select({ id: schema.events.id, code: schema.events.code }).from(schema.events))
  addRows('stories', await appDb.select({ id: schema.stories.id, code: schema.stories.code }).from(schema.stories))
  return out
}

// ─── Apply: copy relationships ────────────────────────────────────────────────

async function copyRelationships(tagIdMap: Map<number, number>, codeToEntry: Map<string, { collection: string; id: number }>): Promise<void> {
  console.log('\nCopying relationships...')
  const rows = await p`
    SELECT id, code, title, from_code, to_code, type, start_year, end_year,
           notes, review_note, updated_at, created_at
    FROM relationships ORDER BY id`
  const tagRels = await p`SELECT parent_id, tags_id FROM relationships_rels WHERE path = 'tags' ORDER BY parent_id`
  const tagMap = buildTagMap(tagRels as PayloadRelRow[], tagIdMap)

  let copied = 0
  let skipped = 0

  for (const r of rows as Row[]) {
    const code = str(r.code)
    const fromCode = str(r.from_code)
    const toCode = str(r.to_code)
    if (!code || !fromCode || !toCode) { skipped++; continue }

    const fromEntry = codeToEntry.get(fromCode)
    const toEntry = codeToEntry.get(toCode)
    if (!fromEntry || !toEntry) { skipped++; continue }

    const pid = num(r.id)!
    const notes = await lexicalToMd(r.notes)

    await appDb.insert(schema.relationships)
      .values({
        code,
        fromCollection: fromEntry.collection, fromId: fromEntry.id, fromCode,
        toCollection: toEntry.collection, toId: toEntry.id, toCode,
        type: str(r.type) ?? 'related_to',
        notes: notes || null,
        startYear: num(r.start_year), endYear: num(r.end_year),
        title: str(r.title),
        tagIds: tagMap.get(pid) ?? [],
        reviewNote: str(r.review_note),
      })
      .onConflictDoUpdate({
        target: schema.relationships.code,
        set: {
          fromCollection: fromEntry.collection, fromId: fromEntry.id, fromCode,
          toCollection: toEntry.collection, toId: toEntry.id, toCode,
          type: str(r.type) ?? 'related_to',
          notes: notes || null,
          startYear: num(r.start_year), endYear: num(r.end_year),
          title: str(r.title), tagIds: tagMap.get(pid) ?? [],
          reviewNote: str(r.review_note),
        },
      })
    copied++
  }

  console.log(`  Copied ${copied} relationships (${skipped} skipped: missing code or entity)`)
}

// ─── Apply: reset counters ────────────────────────────────────────────────────

async function resetCounters(): Promise<void> {
  console.log('\nResetting counters...')
  const prefixQueries: Array<[string, () => Promise<Row[]>]> = [
    ['T', () => p`SELECT MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS INTEGER)) as n FROM tags WHERE code ~ '^T[0-9]+$'`],
    ['C', () => p`SELECT MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS INTEGER)) as n FROM characters WHERE code ~ '^C[0-9]+$'`],
    ['L', () => p`SELECT MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS INTEGER)) as n FROM locations WHERE code ~ '^L[0-9]+$'`],
    ['I', () => p`SELECT MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS INTEGER)) as n FROM items WHERE code ~ '^I[0-9]+$'`],
    ['U', () => p`SELECT MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS INTEGER)) as n FROM cultures WHERE code ~ '^U[0-9]+$'`],
    ['F', () => p`SELECT MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS INTEGER)) as n FROM factions WHERE code ~ '^F[0-9]+$'`],
    ['R', () => p`SELECT MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS INTEGER)) as n FROM races WHERE code ~ '^R[0-9]+$'`],
    ['G', () => p`SELECT MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS INTEGER)) as n FROM languages WHERE code ~ '^G[0-9]+$'`],
    ['K', () => p`SELECT MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS INTEGER)) as n FROM lore WHERE code ~ '^K[0-9]+$'`],
    ['E', () => p`SELECT MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS INTEGER)) as n FROM events WHERE code ~ '^E[0-9]+$'`],
    ['S', () => p`SELECT MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS INTEGER)) as n FROM stories WHERE code ~ '^S[0-9]+$'`],
    ['W', () => p`SELECT MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS INTEGER)) as n FROM writing WHERE code ~ '^W[0-9]+$'`],
    ['X', () => p`SELECT MAX(CAST(REGEXP_REPLACE(code, '[^0-9]', '', 'g') AS INTEGER)) as n FROM relationships WHERE code ~ '^X[0-9]+$'`],
  ]
  for (const [prefix, query] of prefixQueries) {
    try {
      const rows = await query()
      const maxNum = num((rows[0] as Row)?.n)
      if (maxNum !== null && maxNum > 0) {
        await setCounterMinimum(prefix, maxNum + 1)
        console.log(`  ${prefix}: counter set to ${maxNum + 1}`)
      }
    } catch (e) {
      console.log(`  ${prefix}: could not read max (${String(e).split('\n')[0]})`)
    }
  }
}

// ─── Apply: full run ──────────────────────────────────────────────────────────

async function applyRun(): Promise<void> {
  console.log('=== copy-from-payload.ts APPLY ===')
  console.log('Reading from PAYLOAD_DATABASE_URL, writing to APP_DATABASE_URL\n')

  const tagIdMap = await copyTags()

  // Copy all world entity types (pass 1: core fields only, FKs set in pass 2)
  const charIdMap = await copyCharacters(tagIdMap)
  const locIdMap = await copyLocations(tagIdMap)
  const itemIdMap = await copyItems(tagIdMap)
  const cultIdMap = await copyCultures(tagIdMap)
  const facIdMap = await copyFactions(tagIdMap)
  const raceIdMap = await copyRaces(tagIdMap)
  const langIdMap = await copyLanguages(tagIdMap)
  const loreIdMap = await copyLore(tagIdMap)

  const idMaps: WorldIdMaps = {
    characters: charIdMap, locations: locIdMap, items: itemIdMap,
    cultures: cultIdMap, factions: facIdMap, races: raceIdMap,
    languages: langIdMap, lore: loreIdMap,
  }

  // Pass 2: fix FK IDs among world entities
  await fixWorldFKs(idMaps)

  // Events, stories, writing, relationships
  const eventIdMap = await copyEvents(tagIdMap, idMaps)
  const storyIdMap = await copyStories(tagIdMap, idMaps, eventIdMap)
  await copyWriting(tagIdMap, storyIdMap, idMaps)

  // Build code -> new entry map so relationships can resolve from_code / to_code
  const codeToEntry = await buildAllCodeMaps()
  await copyRelationships(tagIdMap, codeToEntry)

  // Reset counters based on highest code in Payload DB
  await resetCounters()

  console.log('\n=== Apply complete. ===')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (APPLY) {
    await applyRun()
  } else {
    await dryRun()
  }
}

main().catch(e => { console.error('FAILED:', e); process.exit(1) })
