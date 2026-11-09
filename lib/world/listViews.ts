// Step U4: per-collection config for the Table and Board views on collection list pages. No new
// collections or columns -- just which extra fields each one's table/board surfaces beyond the
// shared code/name/status/tags, and which field drives the board's columns (status for most,
// stage for stories).

import { STATUS_OPTIONS } from './fields'

export interface ListViewKeyField {
  name: string
  label: string
  kind: 'text' | 'number' | 'select' | 'checkbox'
  options?: { label: string; value: string }[]
}

export interface ListViewConfig {
  statusField: string
  statusOptions: { label: string; value: string }[]
  keyFields: ListViewKeyField[]
}

const EVENT_TYPE_OPTIONS = [
  { label: 'Celestial', value: 'celestial' },
  { label: 'Political', value: 'political' },
  { label: 'Battle', value: 'battle' },
  { label: 'Discovery', value: 'discovery' },
  { label: 'Death', value: 'death' },
  { label: 'Birth', value: 'birth' },
  { label: 'Journey', value: 'journey' },
  { label: 'Other', value: 'other' },
]

const STAGE_OPTIONS = [
  { label: 'Idea', value: 'idea' },
  { label: 'Outlined', value: 'outlined' },
  { label: 'Drafting', value: 'drafting' },
  { label: 'Written', value: 'written' },
  { label: 'Shelved', value: 'shelved' },
]

const ERA_OPTIONS = [
  { label: 'Era One: The Ordinary Life', value: 'era_one' },
  { label: 'Era Two: The Awakening', value: 'era_two' },
  { label: 'Era Three: Traveling Alone', value: 'era_three' },
  { label: 'Era Four: The Archive Years', value: 'era_four' },
  { label: 'Era Five: The Long Collapse', value: 'era_five' },
  { label: 'Era Six: New Orders', value: 'era_six' },
  { label: 'Era Seven: The Search', value: 'era_seven' },
]

const DEFAULT_CONFIG: ListViewConfig = { statusField: 'status', statusOptions: STATUS_OPTIONS, keyFields: [] }

export const LIST_VIEW_CONFIG: Record<string, ListViewConfig> = {
  characters: DEFAULT_CONFIG,
  locations: DEFAULT_CONFIG,
  items: DEFAULT_CONFIG,
  cultures: DEFAULT_CONFIG,
  factions: DEFAULT_CONFIG,
  races: DEFAULT_CONFIG,
  languages: DEFAULT_CONFIG,
  lore: DEFAULT_CONFIG,
  events: {
    statusField: 'status',
    statusOptions: STATUS_OPTIONS,
    keyFields: [
      { name: 'startYear', label: 'Start year', kind: 'number' },
      { name: 'eventType', label: 'Type', kind: 'select', options: EVENT_TYPE_OPTIONS },
    ],
  },
  stories: {
    statusField: 'stage',
    statusOptions: STAGE_OPTIONS,
    keyFields: [
      { name: 'era', label: 'Era', kind: 'select', options: ERA_OPTIONS },
      { name: 'floating', label: 'Floating', kind: 'checkbox' },
    ],
  },
}

export function listViewConfigFor(collection: string): ListViewConfig {
  return LIST_VIEW_CONFIG[collection] ?? DEFAULT_CONFIG
}
