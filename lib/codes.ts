// One place that defines every ID prefix. C10 = Character 10, L4 = Location 4, S12 = Story 12, and so on.
// Codes are permanent: they never change and are never reused, even if an entry is renamed or deleted.

export const ENTITY_PREFIXES = {
  characters: 'C',
  locations: 'L',
  events: 'E',
  items: 'I',
  factions: 'F', // groups of people. Many factions can sit inside one culture.
  cultures: 'U', // a people, their customs, beliefs and way of life
  races: 'R',
  languages: 'G',
  lore: 'K',
  stories: 'S', // story ideas, and the finished stories they grow into
  writing: 'W', // chapters, scenes and snippets: the actual prose
  eras: 'Y', // spans of years on the timeline (step W2)
  maps: 'M', // image maps (step W3)
  'map-pins': 'P', // one marker/label/line/circle/polygon on a map (step W3)
  chronicles: 'H', // a timeline paired with maps (step W4)
} as const

export type EntitySlug = keyof typeof ENTITY_PREFIXES

// Links between entries get codes too (X1, X2...), and so do continuity questions (Q1, Q2...).
// They are records you can point at, but they are not things you link to.
export const RELATIONSHIP_PREFIX = 'X'
export const FLAG_PREFIX = 'Q'
export const TAG_PREFIX = 'T'

// The built-in review tag. Anything tagged UNK was filled in by Claude (or by an import) on a best
// guess and needs Bobby to double check it. He removes the tag once he has confirmed the record.
export const UNK_TAG = 'UNK'

// Reserved for later steps: the collection isn't built yet, but the prefix is claimed so a code
// typed in text today (or a link index row added once the collection exists) never collides.
export const COMPILATION_PREFIX = 'A' // compilations (chapters and ages assembled from events and entries)
export const BEAT_PREFIX = 'B'        // planned story beats (step S5)
export const BOARD_PREFIX = 'D'       // saved node maps, trees, story maps, whiteboards (step W5)
export const TABLE_PREFIX = 'N'       // interactive tables (step W6)

export const ENTITY_SLUGS = Object.keys(ENTITY_PREFIXES) as EntitySlug[]

// The world-building collections. An event "involves" these, and a continuity check compares against them.
export const WORLD_SLUGS = ['characters', 'locations', 'items', 'factions', 'cultures', 'races', 'languages', 'lore'] as const

export const PREFIX_TO_SLUG: Record<string, string> = {
  ...Object.fromEntries(Object.entries(ENTITY_PREFIXES).map(([slug, p]) => [p, slug])),
  [RELATIONSHIP_PREFIX]: 'relationships',
  [FLAG_PREFIX]: 'continuity-flags',
  [TAG_PREFIX]: 'tags',
  [COMPILATION_PREFIX]: 'compilations',
  [BEAT_PREFIX]: 'beats',
  [BOARD_PREFIX]: 'boards',
  [TABLE_PREFIX]: 'tables',
}

// Every letter a code can start with. The single place to touch when a prefix is added -
// CODE_REGEX and the single-code matcher in lib/world/queries.ts both build off this.
export const CODE_PREFIX_CHARS = 'CLEIFRGKSWXQTUABYMPHDN'

// Finds codes like C10, L4, E27 inside any block of text. Whole tokens only, so "C10" matches
// but "ABC10", "C10x" and "C3PO" do not.
export const CODE_REGEX = new RegExp(`(?<![A-Za-z0-9])([${CODE_PREFIX_CHARS}])(\\d{1,6})(?![A-Za-z0-9])`, 'g')

export function extractCodes(text: string): string[] {
  const found = new Set<string>()
  for (const m of text.matchAll(CODE_REGEX)) found.add(`${m[1]}${m[2]}`)
  return [...found]
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
