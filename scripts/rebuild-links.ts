/**
 * Rebuilds the whole `links` index from the records. The index is derived data — never edited by
 * hand, never canon itself — so this script is the recovery path if it ever drifts.
 *
 * Dry run (default): computes what every record's rows should be and prints counts by source.
 * Writes nothing.
 *   npx tsx --env-file=.env.local scripts/rebuild-links.ts
 *
 * Apply: clears the links table, then resyncs every coded record from scratch.
 *   npx tsx --env-file=.env.local scripts/rebuild-links.ts --apply
 *
 * Idempotent: running --apply twice in a row produces identical row counts both times.
 */

import { appDb } from '../db/index'
import * as schema from '../db/schema'
import { computeOwnedLinks, syncLinksForRecord } from '../lib/graph/sync'

type AnyTable = typeof schema.characters

const TABLES: Record<string, AnyTable> = {
  characters: schema.characters as unknown as AnyTable,
  locations: schema.locations as unknown as AnyTable,
  items: schema.items as unknown as AnyTable,
  cultures: schema.cultures as unknown as AnyTable,
  factions: schema.factions as unknown as AnyTable,
  races: schema.races as unknown as AnyTable,
  languages: schema.languages as unknown as AnyTable,
  lore: schema.lore as unknown as AnyTable,
  events: schema.events as unknown as AnyTable,
  stories: schema.stories as unknown as AnyTable,
  writing: schema.writing as unknown as AnyTable,
  relationships: schema.relationships as unknown as AnyTable,
  eras: schema.eras as unknown as AnyTable,
  maps: schema.maps as unknown as AnyTable,
  'map-pins': schema.mapPins as unknown as AnyTable,
  chronicles: schema.chronicles as unknown as AnyTable,
  boards: schema.boards as unknown as AnyTable,
  tables: schema.tables as unknown as AnyTable,
  beats: schema.beats as unknown as AnyTable,
}

const COLLECTIONS = Object.keys(TABLES)

async function idsFor(collection: string): Promise<number[]> {
  const table = TABLES[collection]
  const rows = await appDb.select({ id: table.id }).from(table as never)
  return (rows as { id: number }[]).map(r => r.id)
}

async function run() {
  const apply = process.argv.includes('--apply')
  console.log(`=== rebuild-links.ts (${apply ? 'APPLY' : 'dry run'}) ===\n`)

  if (apply) {
    console.log('Clearing the links table...')
    await appDb.delete(schema.links)
  }

  const countsBySource: Record<string, number> = {}
  let recordsProcessed = 0

  for (const collection of COLLECTIONS) {
    const ids = await idsFor(collection)
    for (const id of ids) {
      if (apply) {
        await syncLinksForRecord(collection, id)
      } else {
        const pending = await computeOwnedLinks(collection, id)
        for (const link of pending) {
          countsBySource[link.source] = (countsBySource[link.source] ?? 0) + 1
        }
      }
    }
    recordsProcessed += ids.length
    console.log(`  ${collection}: ${ids.length} record(s)`)
  }

  if (apply) {
    const rows = await appDb.select({ source: schema.links.source }).from(schema.links)
    for (const r of rows) countsBySource[r.source] = (countsBySource[r.source] ?? 0) + 1
  }

  console.log(`\n${recordsProcessed} record(s) scanned. Link counts by source:`)
  for (const [source, count] of Object.entries(countsBySource).sort()) {
    console.log(`  ${source}: ${count}`)
  }
  const total = Object.values(countsBySource).reduce((a, b) => a + b, 0)
  console.log(`  total: ${total}`)

  console.log(apply ? '\nApplied.' : '\nDry run only — nothing written. Re-run with --apply to write.')
  process.exit(0)
}

run().catch(e => { console.error('FAILED:', e); process.exit(1) })
