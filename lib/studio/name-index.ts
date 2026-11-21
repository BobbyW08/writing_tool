// Matching names while writing. Pure functions, no database and no editor, so the editor and the
// tests share the same rules. The index is built from the list in lib/studio/name-actions.ts.

import type { NameEntry } from '@/lib/studio/name-actions'

// Words that should never pop up a suggestion on their own, even if a name contains them.
const STOPWORDS = new Set([
  'the', 'and', 'but', 'for', 'nor', 'yet', 'was', 'were', 'his', 'her', 'she', 'him', 'they', 'them',
  'their', 'with', 'from', 'that', 'this', 'then', 'than', 'into', 'onto', 'over', 'under', 'when',
  'what', 'who', 'how', 'why', 'you', 'your', 'our', 'out', 'not', 'are', 'has', 'had', 'have',
])

const MIN_TERM = 3
const WORD = /[\p{L}\p{N}'’-]+/gu

export type Term = { text: string; lower: string; entry: NameEntry }

export type NameIndex = {
  terms: Term[]
  // Terms that point at exactly one entry. A term shared by two entries is never linked on its own.
  unique: Map<string, Term>
  matcher: RegExp | null
}

// Every way an entry can be written in prose: its name, its name without a trailing (note), and
// its aliases.
export function termsFor(entry: NameEntry): string[] {
  const out = new Set<string>()
  const add = (t: string) => {
    const s = t.trim()
    if (s.length >= MIN_TERM) out.add(s)
  }
  add(entry.name)
  add(entry.name.replace(/\s*\([^)]*\)\s*$/, ''))
  for (const a of entry.aliases) add(a)
  return [...out]
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildIndex(entries: NameEntry[]): NameIndex {
  const terms: Term[] = []
  for (const entry of entries) {
    for (const text of termsFor(entry)) terms.push({ text, lower: text.toLowerCase(), entry })
  }
  const byText = new Map<string, Term[]>()
  for (const t of terms) {
    if (!byText.has(t.text)) byText.set(t.text, [])
    byText.get(t.text)!.push(t)
  }
  const unique = new Map<string, Term>()
  for (const [text, list] of byText) {
    const codes = new Set(list.map((t) => t.entry.code))
    if (codes.size === 1 && !STOPWORDS.has(text.toLowerCase())) unique.set(text, list[0])
  }
  const alternation = [...unique.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')
  const matcher = alternation
    ? new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternation})(?![\\p{L}\\p{N}])`, 'gu')
    : null
  return { terms, unique, matcher }
}

// ─── Suggestions while typing ────────────────────────────────────────────────

export type Suggestion = {
  entry: NameEntry
  // What the link shows in the prose: the name as it would be written, for example "Bard".
  insertText: string
}

export type TypingMatch = {
  // Where, in the text before the caret, the part to be replaced starts.
  start: number
  typed: string
  suggestions: Suggestion[]
}

const MAX_SUGGESTIONS = 6

// The order entry types appear in the autocomplete when names tie on everything else:
// Characters, Locations, Events, Factions, Cultures, Items, Lore last (next.md, step UX0).
const TYPE_ORDER = [
  'characters', 'locations', 'events', 'factions', 'cultures', 'items', 'races', 'languages', 'stories', 'lore',
]
function typeRank(collection: string): number {
  const i = TYPE_ORDER.indexOf(collection)
  return i === -1 ? TYPE_ORDER.length : i
}

// Ranks matches for display: an exact match of what was typed first, then grouped by entry type,
// then alphabetically. Mutates nothing -- returns a new array for the caller to dedupe and cap.
function rankHits(hits: { text: string; lower: string; entry: NameEntry }[], query: string): { text: string; lower: string; entry: NameEntry }[] {
  const q = query.trim().toLowerCase()
  return [...hits].sort((a, b) => {
    const aExact = a.lower === q
    const bExact = b.lower === q
    if (aExact !== bExact) return aExact ? -1 : 1
    const typeDiff = typeRank(a.entry.collection) - typeRank(b.entry.collection)
    if (typeDiff !== 0) return typeDiff
    const aStarts = a.lower.startsWith(q)
    const bStarts = b.lower.startsWith(q)
    if (aStarts !== bStarts) return aStarts ? -1 : 1
    return a.text.localeCompare(b.text)
  })
}

// One suggestion per entry, in the order entries first appeared. When an entry matches under more
// than one spelling, the shortest wins, so "Bar" gives "Bard" rather than "Bard (Original)".
function dedupe(list: Suggestion[]): Suggestion[] {
  const best = new Map<string, Suggestion>()
  for (const s of list) {
    const cur = best.get(s.entry.code)
    if (!cur || s.insertText.length < cur.insertText.length) best.set(s.entry.code, s)
  }
  return [...best.values()].slice(0, MAX_SUGGESTIONS)
}

// Typing "@" opens the full list, narrowed by whatever follows it.
export function suggestForAt(index: NameIndex, query: string): Suggestion[] {
  const q = query.trim().toLowerCase()
  const matched = index.terms.filter((t) => !q || t.lower.includes(q))
  const hits = rankHits(matched, query).map((t) => ({ entry: t.entry, insertText: t.text }))
  return dedupe(hits)
}

// Plain typing. Looks at up to the last four words before the caret and offers entries whose
// name begins the same way, so "The First Emp" finds "The First Empress" and "Emp" does too.
export function suggestForTyping(index: NameIndex, textBeforeCaret: string): TypingMatch | null {
  const tail = textBeforeCaret.slice(-80)
  const offset = textBeforeCaret.length - tail.length
  const words = [...tail.matchAll(WORD)].map((m) => ({ text: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length }))
  if (words.length === 0) return null
  const last = words[words.length - 1]
  if (last.end !== tail.length) return null // cursor is after a space or punctuation

  // Keep only the run of words joined by plain spaces.
  let first = words.length - 1
  while (first > 0 && words.length - first < 4 && /^[ \t]+$/.test(tail.slice(words[first - 1].end, words[first].start))) first--

  for (let i = first; i < words.length; i++) {
    const startInTail = words[i].start
    const typed = tail.slice(startInTail)
    const lower = typed.toLowerCase()
    const multiWord = i < words.length - 1
    if (typed.length < MIN_TERM) continue
    if (!multiWord && STOPWORDS.has(lower)) continue
    const capital = /^\p{Lu}/u.test(typed)

    const hits: Term[] = []
    for (const t of index.terms) {
      if (t.lower.startsWith(lower) && (capital || typed.length >= 4)) {
        hits.push(t)
      } else if (!multiWord && capital && t.lower.split(/\s+/).slice(1).some((w) => w.startsWith(lower))) {
        // A later word in a longer name, such as "Emp" in "The First Empress".
        hits.push(t)
      }
    }
    const suggestions = dedupe(rankHits(hits, typed).map((t) => ({ entry: t.entry, insertText: t.text })))
    if (suggestions.length > 0) return { start: offset + startInTail, typed, suggestions }
  }
  return null
}

// ─── Names written out but not linked ────────────────────────────────────────

export type NameMatch = { start: number; end: number; text: string; entry: NameEntry }

// Finds names in plain prose. Case matters, so "Bard" matches but "bard" does not.
export function findMatches(index: NameIndex, text: string): NameMatch[] {
  if (!index.matcher) return []
  const out: NameMatch[] = []
  for (const m of text.matchAll(index.matcher)) {
    const term = index.unique.get(m[0])
    if (!term) continue
    out.push({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, text: m[0], entry: term.entry })
  }
  return out
}
