// Which free-text fields on each collection get scanned for ID codes (the `text` link source:
// "an ID code typed in rich text, a textarea, a detail value, a table cell or writing").
// lib/graph/sync.ts's extractTextLinks() reads this registry and runs extractCodes() over each
// field it names. A code with no matching record is just not indexed (not an error) — the sync
// engine looks the code up and skips it if resolveCodeLookup-style lookup comes back empty.

export type TextFieldSource =
  | { kind: 'plain'; field: string } // a single markdown/text column, fieldName = the field name
  | { kind: 'details' } // the `details` jsonb array, fieldName = `details.<label>` per row

const WORLD_TEXT_FIELDS: TextFieldSource[] = [
  { kind: 'plain', field: 'body' },
  { kind: 'details' },
]

export const TEXT_FIELDS: Record<string, TextFieldSource[]> = {
  characters: WORLD_TEXT_FIELDS,
  locations: WORLD_TEXT_FIELDS,
  items: WORLD_TEXT_FIELDS,
  cultures: WORLD_TEXT_FIELDS,
  factions: WORLD_TEXT_FIELDS,
  races: WORLD_TEXT_FIELDS,
  languages: WORLD_TEXT_FIELDS,
  lore: WORLD_TEXT_FIELDS,
  events: [
    { kind: 'plain', field: 'body' },
    { kind: 'plain', field: 'whatHappened' },
    { kind: 'plain', field: 'whyItHappened' },
    { kind: 'plain', field: 'whatItCaused' },
    { kind: 'plain', field: 'whatWasLearned' },
    { kind: 'details' },
  ],
  stories: [{ kind: 'plain', field: 'body' }],
  writing: [{ kind: 'plain', field: 'text' }],
  maps: WORLD_TEXT_FIELDS,
  'map-pins': [{ kind: 'plain', field: 'summary' }],
  chronicles: WORLD_TEXT_FIELDS,
  boards: WORLD_TEXT_FIELDS,
}
