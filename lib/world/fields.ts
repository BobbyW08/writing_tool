// Field definitions that drive the create form and in-place editor.
// Each entry names a field, its label, its editor type and any options.

export type FieldKind = 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'relationship'

export interface FieldDef {
  name: string
  label: string
  kind: FieldKind
  required?: boolean
  options?: { label: string; value: string }[]
  relationTo?: string
  hasMany?: boolean
  description?: string
}

const STATUS_OPTIONS = [
  { label: 'Locked (canon)', value: 'locked' },
  { label: 'In development', value: 'in_development' },
  { label: 'Needs a name', value: 'needs_name' },
  { label: 'Placeholder (still to decide)', value: 'placeholder' },
]

const opts = (values: string[]) =>
  values.map((v) => ({ label: v[0].toUpperCase() + v.slice(1), value: v }))

// Fields shared by all world collections and events (excluding code/slug/details/body/tags/parent/image)
const COMMON: FieldDef[] = [
  { name: 'name', label: 'Name', kind: 'text', required: true },
  { name: 'summary', label: 'Summary', kind: 'textarea' },
  { name: 'status', label: 'Status', kind: 'select', options: STATUS_OPTIONS },
  { name: 'gapPrompt', label: 'Gap prompt', kind: 'textarea' },
]

export const COLLECTION_FIELDS: Record<string, FieldDef[]> = {
  characters: [
    ...COMMON,
    { name: 'role', label: 'Role', kind: 'text', description: 'protagonist, mentor, antagonist...' },
    { name: 'birthYear', label: 'Born (year)', kind: 'number' },
    { name: 'deathYear', label: 'Died (year)', kind: 'number' },
    { name: 'birthplace', label: 'Birthplace', kind: 'relationship', relationTo: 'locations' },
    { name: 'race', label: 'Race', kind: 'relationship', relationTo: 'races' },
    { name: 'culture', label: 'Culture', kind: 'relationship', relationTo: 'cultures' },
    { name: 'parent', label: 'Part of', kind: 'relationship', relationTo: 'characters' },
  ],
  locations: [
    ...COMMON,
    {
      name: 'kind',
      label: 'Kind',
      kind: 'select',
      options: opts(['world', 'region', 'city', 'town', 'building', 'landmark', 'other']),
    },
    { name: 'culture', label: 'Culture', kind: 'relationship', relationTo: 'cultures' },
    { name: 'parent', label: 'Part of', kind: 'relationship', relationTo: 'locations' },
  ],
  items: [
    ...COMMON,
    { name: 'itemType', label: 'Item type', kind: 'text' },
    { name: 'createdYear', label: 'Created (year)', kind: 'number' },
    { name: 'currentOwner', label: 'Current owner', kind: 'relationship', relationTo: 'characters' },
    { name: 'currentLocation', label: 'Current location', kind: 'relationship', relationTo: 'locations' },
    { name: 'parent', label: 'Part of', kind: 'relationship', relationTo: 'items' },
  ],
  cultures: [
    ...COMMON,
    { name: 'foundedYear', label: 'Emerged (year)', kind: 'number' },
    { name: 'endedYear', label: 'Ended (year)', kind: 'number' },
    { name: 'parent', label: 'Part of', kind: 'relationship', relationTo: 'cultures' },
  ],
  factions: [
    ...COMMON,
    {
      name: 'kind',
      label: 'Kind',
      kind: 'select',
      options: opts(['faction', 'organization', 'government', 'order', 'movement']),
    },
    { name: 'culture', label: 'Culture', kind: 'relationship', relationTo: 'cultures' },
    { name: 'foundedYear', label: 'Founded (year)', kind: 'number' },
    { name: 'endedYear', label: 'Ended (year)', kind: 'number' },
    { name: 'parent', label: 'Part of', kind: 'relationship', relationTo: 'factions' },
  ],
  races: [
    ...COMMON,
    { name: 'parent', label: 'Part of', kind: 'relationship', relationTo: 'races' },
  ],
  languages: [
    ...COMMON,
    { name: 'parent', label: 'Part of', kind: 'relationship', relationTo: 'languages' },
  ],
  lore: [
    ...COMMON,
    { name: 'category', label: 'Category', kind: 'text', description: 'myth, history, magic system, religion...' },
    { name: 'parent', label: 'Part of', kind: 'relationship', relationTo: 'lore' },
  ],
  events: [
    { name: 'name', label: 'Name', kind: 'text', required: true },
    { name: 'summary', label: 'Summary', kind: 'textarea' },
    { name: 'status', label: 'Status', kind: 'select', options: STATUS_OPTIONS },
    { name: 'startYear', label: 'Year', kind: 'number' },
    { name: 'endYear', label: 'End year', kind: 'number' },
    { name: 'yearLabel', label: 'Year label', kind: 'text' },
    { name: 'location', label: 'Location', kind: 'relationship', relationTo: 'locations' },
    { name: 'eventType', label: 'Event type', kind: 'select', options: opts(['celestial', 'political', 'battle', 'discovery', 'death', 'birth', 'journey', 'other']) },
    { name: 'importance', label: 'Importance', kind: 'select', options: opts(['minor', 'normal', 'important']) },
    { name: 'lane', label: 'Timeline lane', kind: 'number', description: '0 to 10. Events in different lanes run in parallel on the timeline.' },
    { name: 'whatHappened', label: 'What happened', kind: 'textarea' },
    { name: 'whyItHappened', label: 'Why it happened', kind: 'textarea' },
    { name: 'whatItCaused', label: 'What it caused', kind: 'textarea' },
    { name: 'whatWasLearned', label: 'What was learned', kind: 'textarea' },
    { name: 'gapPrompt', label: 'Gap prompt', kind: 'textarea' },
    { name: 'parent', label: 'Parent event', kind: 'relationship', relationTo: 'events' },
  ],
  stories: [
    { name: 'name', label: 'Name', kind: 'text', required: true },
    { name: 'summary', label: 'Summary', kind: 'textarea' },
    {
      name: 'stage',
      label: 'Stage',
      kind: 'select',
      options: opts(['idea', 'outlined', 'drafting', 'written', 'shelved']),
    },
    {
      name: 'format',
      label: 'Format',
      kind: 'select',
      options: [
        { label: 'Novel', value: 'novel' },
        { label: 'Novella', value: 'novella' },
        { label: 'Short story', value: 'short_story' },
        { label: 'Vignette', value: 'vignette' },
        { label: 'Other', value: 'other' },
      ],
    },
    {
      name: 'era',
      label: 'Era',
      kind: 'select',
      options: [
        { label: 'Era One: The Ordinary Life', value: 'era_one' },
        { label: 'Era Two: The Awakening', value: 'era_two' },
        { label: 'Era Three: Traveling Alone', value: 'era_three' },
        { label: 'Era Four: The Archive Years', value: 'era_four' },
        { label: 'Era Five: The Long Collapse', value: 'era_five' },
        { label: 'Era Six: New Orders', value: 'era_six' },
        { label: 'Era Seven: The Search', value: 'era_seven' },
      ],
    },
    { name: 'startYear', label: 'Starts (year)', kind: 'number' },
    { name: 'endYear', label: 'Ends (year)', kind: 'number' },
    { name: 'yearLabel', label: 'Year label', kind: 'text' },
    { name: 'floating', label: 'Floating (no fixed year)', kind: 'checkbox' },
    { name: 'gapPrompt', label: 'Gap prompt', kind: 'textarea' },
  ],
}

// Relationship types live in lib/relationshipTypes.ts
