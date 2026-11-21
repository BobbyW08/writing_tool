'use server'
import { ilike, or, sql } from 'drizzle-orm'
import { appDb } from '@/db/index'
import * as schema from '@/db/schema'

// Everything you can link to from writing or find from the search box. Every table here has
// id, code, name and aliases.
const NAME_TABLES = {
  characters: schema.characters,
  locations: schema.locations,
  items: schema.items,
  cultures: schema.cultures,
  factions: schema.factions,
  races: schema.races,
  languages: schema.languages,
  lore: schema.lore,
  events: schema.events,
  stories: schema.stories,
} as unknown as Record<string, typeof schema.characters>

export type NameEntry = {
  code: string
  name: string
  collection: string
  aliases: string[]
}

function aliasList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((a) => (a && typeof a === 'object' && 'alias' in a ? String((a as { alias: unknown }).alias ?? '') : ''))
    .map((a) => a.trim())
    .filter(Boolean)
}

// The full list of names, loaded once when the editor opens so linking while typing is instant.
export async function listLinkableNames(): Promise<NameEntry[]> {
  const out: NameEntry[] = []
  await Promise.all(
    Object.entries(NAME_TABLES).map(async ([collection, table]) => {
      const rows = await appDb.select({ code: table.code, name: table.name, aliases: table.aliases }).from(table)
      for (const r of rows) out.push({ code: r.code, name: r.name, collection, aliases: aliasList(r.aliases) })
    }),
  )
  return out
}

// Name search for the sidebar box. Matches names and aliases, ignoring case. Names that start with
// what was typed come first.
export async function findNames(query: string): Promise<{ code: string; name: string; collection: string }[]> {
  const q = query.trim()
  if (q.length < 1) return []
  const contains = `%${q}%`
  const found: { code: string; name: string; collection: string; starts: boolean }[] = []
  await Promise.all(
    Object.entries(NAME_TABLES).map(async ([collection, table]) => {
      const rows = await appDb
        .select({ code: table.code, name: table.name })
        .from(table)
        .where(or(ilike(table.name, contains), sql`${table.aliases}::text ilike ${contains}`))
        .limit(8)
      for (const r of rows) {
        found.push({ code: r.code, name: r.name, collection, starts: r.name.toLowerCase().startsWith(q.toLowerCase()) })
      }
    }),
  )
  return found
    .sort((a, b) => Number(b.starts) - Number(a.starts) || a.name.localeCompare(b.name))
    .slice(0, 8)
    .map(({ code, name, collection }) => ({ code, name, collection }))
}
