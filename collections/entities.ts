import type { Field } from 'payload'
import { entityCollection } from './entity'
import { WORLD_SLUGS } from '../lib/codes'

// In-universe years: year 0 is the year SERO is born. Negative years come before that (prequels).
const yearField = (name: string, label: string, description?: string): Field => ({
  name,
  label,
  type: 'number',
  admin: { description, step: 1 },
})

const options = (values: string[]) => values.map((v) => ({ label: v[0].toUpperCase() + v.slice(1), value: v }))

const WORLD = 'World'
const STORY = 'Story'

export const Characters = entityCollection({
  slug: 'characters',
  singular: 'Character',
  plural: 'Characters',
  group: WORLD,
  fields: [
    { name: 'role', type: 'text', admin: { description: 'e.g. protagonist, mentor, antagonist' } },
    yearField('birthYear', 'Born (year)', 'Year 0 = the year SERO is born'),
    yearField('deathYear', 'Died (year)'),
    { name: 'birthplace', type: 'relationship', relationTo: 'locations' },
    { name: 'race', type: 'relationship', relationTo: 'races' },
    { name: 'culture', type: 'relationship', relationTo: 'cultures' },
  ],
})

export const Locations = entityCollection({
  slug: 'locations',
  singular: 'Location',
  plural: 'Locations',
  group: WORLD,
  fields: [
    { name: 'kind', type: 'select', options: options(['world', 'region', 'city', 'town', 'building', 'landmark', 'other']) },
    { name: 'culture', type: 'relationship', relationTo: 'cultures', admin: { description: 'The culture that lives here or controls it.' } },
  ],
})

export const Items = entityCollection({
  slug: 'items',
  singular: 'Item',
  plural: 'Items and artifacts',
  group: WORLD,
  fields: [
    { name: 'itemType', type: 'text', admin: { description: 'artifact, weapon, vehicle, document...' } },
    yearField('createdYear', 'Created (year)'),
    { name: 'currentOwner', type: 'relationship', relationTo: 'characters' },
    { name: 'currentLocation', type: 'relationship', relationTo: 'locations' },
  ],
})

// A culture is a people and their way of life. Factions are groups that sit inside one.
// Many factions can belong to the same culture.
export const Cultures = entityCollection({
  slug: 'cultures',
  singular: 'Culture',
  plural: 'Cultures',
  group: WORLD,
  fields: [
    { name: 'homelands', type: 'relationship', relationTo: 'locations', hasMany: true },
    { name: 'languages', type: 'relationship', relationTo: 'languages', hasMany: true, label: 'Languages spoken' },
    yearField('foundedYear', 'Emerged (year)'),
    yearField('endedYear', 'Ended (year)'),
  ],
})

export const Factions = entityCollection({
  slug: 'factions',
  singular: 'Faction',
  plural: 'Factions',
  group: WORLD,
  fields: [
    { name: 'kind', type: 'select', options: options(['faction', 'organization', 'government', 'order', 'movement']) },
    { name: 'culture', type: 'relationship', relationTo: 'cultures', admin: { description: 'The culture this faction sits inside. Many factions can share one culture.' } },
    yearField('foundedYear', 'Founded (year)'),
    yearField('endedYear', 'Ended (year)'),
  ],
})

export const Races = entityCollection({ slug: 'races', singular: 'Race', plural: 'Races', group: WORLD })

export const Languages = entityCollection({ slug: 'languages', singular: 'Language', plural: 'Languages', group: WORLD })

export const Lore = entityCollection({
  slug: 'lore',
  singular: 'Lore entry',
  plural: 'Lore',
  group: WORLD,
  fields: [{ name: 'category', type: 'text', admin: { description: 'myth, history, magic system, religion...' } }],
})

export const Events = entityCollection({
  slug: 'events',
  singular: 'Event',
  plural: 'Events',
  group: STORY,
  titleField: 'name',
  fields: [
    // Position on the timeline. "startYear" is where it sits (and what dragging changes).
    // "yearLabel" is display text and is never rewritten by a drag.
    yearField('startYear', 'Year', 'Where it sits on the timeline. Year 0 = SERO is born. Negative = before.'),
    yearField('endYear', 'End year', 'Leave empty for a single point in time'),
    { name: 'yearLabel', type: 'text', label: 'Year label', admin: { description: 'Display text, e.g. "Age ~350-400". Independent of the year number.' } },
    { name: 'sortOrder', type: 'number', defaultValue: 0, admin: { description: 'Breaks ties between events in the same year. Lower comes first.' } },
    { name: 'location', type: 'relationship', relationTo: 'locations' },
    // Required for the timeline filter: "every event involving X" depends on this list.
    {
      name: 'involves',
      type: 'relationship',
      relationTo: [...WORLD_SLUGS],
      hasMany: true,
      label: 'Involves',
      admin: { description: 'Every character, place, item or group in this event.' },
    },
    { name: 'whatHappened', type: 'textarea', label: 'What happened' },
    { name: 'whyItHappened', type: 'textarea', label: 'Why it happened' },
    { name: 'whatItCaused', type: 'textarea', label: 'What it caused' },
    { name: 'whatWasLearned', type: 'textarea', label: 'What was learned' },
    { name: 'draftText', type: 'richText', label: 'Scene notes' },
  ],
})

// Story ideas, and the finished stories they grow into. One record per story: the whole
// Sero_Story_Catalog lives here (novels, novellas, short stories), each with its beats.
export const Stories = entityCollection({
  slug: 'stories',
  singular: 'Story',
  plural: 'Stories and ideas',
  group: STORY,
  titleField: 'name',
  fields: [
    {
      name: 'stage',
      type: 'select',
      defaultValue: 'idea',
      label: 'Stage',
      admin: { position: 'sidebar' },
      options: [
        { label: 'Idea', value: 'idea' },
        { label: 'Outlined', value: 'outlined' },
        { label: 'Drafting', value: 'drafting' },
        { label: 'Written', value: 'written' },
        { label: 'Shelved', value: 'shelved' },
      ],
    },
    {
      name: 'format',
      type: 'select',
      options: options(['novel', 'novella', 'short story', 'vignette', 'other']).map((o) => ({ ...o, value: o.value.replace(' ', '_') })),
    },
    {
      name: 'era',
      type: 'select',
      options: [
        'Era One: The Ordinary Life',
        'Era Two: The Awakening',
        'Era Three: Traveling Alone',
        'Era Four: The Archive Years',
        'Era Five: The Long Collapse',
        'Era Six: New Orders',
        'Era Seven: The Search',
      ].map((v) => ({ label: v, value: v.split(':')[0].toLowerCase().replace(' ', '_') })),
    },
    yearField('startYear', 'Starts (year)', 'In-universe year the story begins. Year 0 = SERO is born.'),
    yearField('endYear', 'Ends (year)'),
    { name: 'yearLabel', type: 'text', label: 'Year label', admin: { description: 'e.g. "Age ~75" or "Floating, suggested 250 to 280"' } },
    { name: 'floating', type: 'checkbox', defaultValue: false, admin: { description: 'The story has no fixed place on the timeline yet.' } },
    {
      name: 'beats',
      type: 'array',
      label: 'Beats',
      admin: { description: 'The story points, in order. These are your notes, not prose.' },
      fields: [{ name: 'beat', type: 'textarea', required: true }],
    },
    {
      name: 'involves',
      type: 'relationship',
      relationTo: [...WORLD_SLUGS],
      hasMany: true,
      label: 'Involves',
      admin: { description: 'Characters, places and items that appear. Placeholder names are real Characters with status "needs a name".' },
    },
    { name: 'dramatizes', type: 'relationship', relationTo: 'events', hasMany: true, label: 'Dramatizes events' },
    { name: 'catalogNumber', type: 'number', admin: { readOnly: true, position: 'sidebar', description: 'Its number in the original Story Catalog, if it had one.' } },
  ],
})

// The actual prose: chapters, scenes and snippets. Saving one triggers the continuity check.
export const Writing = entityCollection({
  slug: 'writing',
  singular: 'Writing',
  plural: 'Writing',
  group: STORY,
  titleField: 'name',
  omit: ['details', 'body'],
  fields: [
    {
      name: 'kind',
      type: 'select',
      defaultValue: 'snippet',
      options: options(['chapter', 'scene', 'snippet']),
      admin: { position: 'sidebar' },
    },
    { name: 'story', type: 'relationship', relationTo: 'stories', admin: { position: 'sidebar' } },
    { name: 'order', type: 'number', defaultValue: 0, admin: { position: 'sidebar' } },
    yearField('startYear', 'Story year', 'Where this sits in-universe. Used to tell a conflict from a change over time.'),
    { name: 'text', type: 'richText', label: 'Text', required: true },
    {
      name: 'mentions',
      type: 'relationship',
      relationTo: [...WORLD_SLUGS],
      hasMany: true,
      admin: { description: 'Everything this piece touches. Filled in by the continuity check, or by hand.' },
    },
    // Plain text copy of the prose, so the continuity check can verify quotes word for word.
    { name: 'plainText', type: 'textarea', admin: { readOnly: true, hidden: true } },
    {
      type: 'collapsible',
      label: 'Continuity check',
      admin: { initCollapsed: true },
      fields: [
        {
          name: 'checkStatus',
          type: 'select',
          defaultValue: 'unchecked',
          options: options(['unchecked', 'checking', 'checked', 'failed']),
          admin: { readOnly: true },
        },
        { name: 'checkStartedAt', type: 'date', admin: { readOnly: true } },
        { name: 'checkedAt', type: 'date', admin: { readOnly: true } },
        { name: 'checkError', type: 'textarea', admin: { readOnly: true } },
        { name: 'checkNotes', type: 'textarea', admin: { readOnly: true } },
      ],
    },
  ],
})

export const entityCollections = [Characters, Locations, Items, Cultures, Factions, Races, Languages, Lore, Events, Stories, Writing]
