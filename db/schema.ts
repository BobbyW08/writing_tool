// New app schema on APP_DATABASE_URL. Mirrors the Payload collections field for field.
// Shared columns are emitted by sharedCols() to keep them defined once.

import {
  pgTable, serial, text, integer, boolean, jsonb, timestamp, unique, index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ─── Shared column helper ────────────────────────────────────────────────────
// Every world entry (characters, locations, items, cultures, factions, races,
// languages, lore), plus events, stories, writing and relationships, carries
// at least code/slug/name and the review fields.
function sharedCols() {
  return {
    id: serial('id').primaryKey(),
    code: text('code').unique().notNull(),
    slug: text('slug').unique().notNull(),
    name: text('name').notNull(),
    aliases: jsonb('aliases').$type<{ alias: string }[]>().default(sql`'[]'::jsonb`),
    summary: text('summary'),
    status: text('status').notNull().default('in_development'),
    gapPrompt: text('gap_prompt'),
    reviewNote: text('review_note'),
    tagIds: jsonb('tag_ids').$type<number[]>().default(sql`'[]'::jsonb`),
    sourceDocId: text('source_doc_id'),
    legacyId: text('legacy_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  }
}

// World entries also share: details rows, a body (Markdown), parentId, imageId.
function worldSharedCols() {
  return {
    ...sharedCols(),
    details: jsonb('details')
      .$type<{ label: string; value: string; inInfobox: boolean; id?: string }[]>()
      .default(sql`'[]'::jsonb`),
    body: text('body'),
    parentId: integer('parent_id'),
    imageId: integer('image_id'),
  }
}

// ─── World entry tables ───────────────────────────────────────────────────────

export const characters = pgTable('characters', {
  ...worldSharedCols(),
  role: text('role'),
  birthYear: integer('birth_year'),
  deathYear: integer('death_year'),
  birthplaceId: integer('birthplace_id'),
  raceId: integer('race_id'),
  cultureId: integer('culture_id'),
}, (t) => [
  index('characters_code_idx').on(t.code),
  index('characters_legacy_idx').on(t.legacyId),
  index('characters_parent_idx').on(t.parentId),
])

export const locations = pgTable('locations', {
  ...worldSharedCols(),
  kind: text('kind'),
  cultureId: integer('culture_id'),
}, (t) => [
  index('locations_code_idx').on(t.code),
  index('locations_legacy_idx').on(t.legacyId),
  index('locations_parent_idx').on(t.parentId),
])

export const items = pgTable('items', {
  ...worldSharedCols(),
  itemType: text('item_type'),
  createdYear: integer('created_year'),
  currentOwnerId: integer('current_owner_id'),
  currentLocationId: integer('current_location_id'),
}, (t) => [
  index('items_code_idx').on(t.code),
  index('items_legacy_idx').on(t.legacyId),
])

export const cultures = pgTable('cultures', {
  ...worldSharedCols(),
  foundedYear: integer('founded_year'),
  endedYear: integer('ended_year'),
  homelandIds: jsonb('homeland_ids').$type<number[]>().default(sql`'[]'::jsonb`),
  cultureLanguageIds: jsonb('culture_language_ids').$type<number[]>().default(sql`'[]'::jsonb`),
}, (t) => [
  index('cultures_code_idx').on(t.code),
  index('cultures_legacy_idx').on(t.legacyId),
])

export const factions = pgTable('factions', {
  ...worldSharedCols(),
  kind: text('kind'),
  cultureId: integer('culture_id'),
  foundedYear: integer('founded_year'),
  endedYear: integer('ended_year'),
}, (t) => [
  index('factions_code_idx').on(t.code),
  index('factions_legacy_idx').on(t.legacyId),
])

export const races = pgTable('races', {
  ...worldSharedCols(),
}, (t) => [
  index('races_code_idx').on(t.code),
  index('races_legacy_idx').on(t.legacyId),
])

export const languages = pgTable('languages', {
  ...worldSharedCols(),
}, (t) => [
  index('languages_code_idx').on(t.code),
  index('languages_legacy_idx').on(t.legacyId),
])

export const lore = pgTable('lore', {
  ...worldSharedCols(),
  category: text('category'),
}, (t) => [
  index('lore_code_idx').on(t.code),
  index('lore_legacy_idx').on(t.legacyId),
])

// ─── Events ──────────────────────────────────────────────────────────────────

export const events = pgTable('events', {
  ...sharedCols(),
  details: jsonb('details')
    .$type<{ label: string; value: string; inInfobox: boolean; id?: string }[]>()
    .default(sql`'[]'::jsonb`),
  body: text('body'),
  parentId: integer('parent_id'),
  imageId: integer('image_id'),
  startYear: integer('start_year'),
  endYear: integer('end_year'),
  yearLabel: text('year_label'),
  sortOrder: integer('sort_order').default(0),
  locationId: integer('location_id'),
  whatHappened: text('what_happened'),
  whyItHappened: text('why_it_happened'),
  whatItCaused: text('what_it_caused'),
  whatWasLearned: text('what_was_learned'),
  // New, step W2: timeline rendering.
  eventType: text('event_type'), // celestial | political | battle | discovery | death | birth | journey | other
  importance: text('importance').notNull().default('normal'), // minor | normal | important
  lane: integer('lane').notNull().default(0), // 0-10, parallel timeline lanes
}, (t) => [
  index('events_code_idx').on(t.code),
  index('events_start_year_idx').on(t.startYear),
  index('events_legacy_idx').on(t.legacyId),
])

// ─── Eras (new, step W2, code Y) ──────────────────────────────────────────────
// A span of years on the timeline. parentId lets an age sit inside an era.

export const eras = pgTable('eras', {
  ...worldSharedCols(),
  startYear: integer('start_year'),
  endYear: integer('end_year'),
  yearLabel: text('year_label'),
  color: text('color'),
  kind: text('kind').notNull().default('era'), // era | age | period
}, (t) => [
  index('eras_code_idx').on(t.code),
  index('eras_parent_idx').on(t.parentId),
])

// Many-to-many: events involve world entries (characters/locations/items/etc.)
export const eventInvolves = pgTable('event_involves', {
  id: serial('id').primaryKey(),
  eventId: integer('event_id').notNull(),
  entryCollection: text('entry_collection').notNull(),
  entryId: integer('entry_id').notNull(),
}, (t) => [
  unique().on(t.eventId, t.entryCollection, t.entryId),
  index('event_involves_event_idx').on(t.eventId),
  index('event_involves_entry_idx').on(t.entryCollection, t.entryId),
])

// ─── Stories ─────────────────────────────────────────────────────────────────

export const stories = pgTable('stories', {
  ...sharedCols(),
  body: text('body'),
  imageId: integer('image_id'),
  stage: text('stage').default('idea'),
  format: text('format'),
  era: text('era'),
  startYear: integer('start_year'),
  endYear: integer('end_year'),
  yearLabel: text('year_label'),
  floating: boolean('floating').default(false),
  catalogNumber: integer('catalog_number'),
}, (t) => [
  index('stories_code_idx').on(t.code),
  index('stories_legacy_idx').on(t.legacyId),
])

export const storyInvolves = pgTable('story_involves', {
  id: serial('id').primaryKey(),
  storyId: integer('story_id').notNull(),
  entryCollection: text('entry_collection').notNull(),
  entryId: integer('entry_id').notNull(),
}, (t) => [
  unique().on(t.storyId, t.entryCollection, t.entryId),
])

export const storyDramatizes = pgTable('story_dramatizes', {
  id: serial('id').primaryKey(),
  storyId: integer('story_id').notNull(),
  eventId: integer('event_id').notNull(),
}, (t) => [
  unique().on(t.storyId, t.eventId),
])

// ─── Writing ─────────────────────────────────────────────────────────────────

export const writing = pgTable('writing', {
  id: serial('id').primaryKey(),
  code: text('code').unique().notNull(),
  slug: text('slug').unique().notNull(),
  name: text('name').notNull(),
  canonState: text('canon_state').notNull().default('draft'),
  kind: text('kind').default('snippet'),
  storyId: integer('story_id'),
  order: integer('order').default(0),
  startYear: integer('start_year'),
  text: text('text'),
  plainText: text('plain_text'),
  tagIds: jsonb('tag_ids').$type<number[]>().default(sql`'[]'::jsonb`),
  reviewNote: text('review_note'),
  sourceDocId: text('source_doc_id'),
  legacyId: text('legacy_id'),
  // Continuity check status (step S7 / Phase 4). checkStatus: unchecked | checking | checked | failed.
  checkStatus: text('check_status').default('unchecked'),
  checkStartedAt: timestamp('check_started_at', { withTimezone: true }),
  checkedAt: timestamp('checked_at', { withTimezone: true }),
  checkNotes: text('check_notes'),
  checkError: text('check_error'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('writing_code_idx').on(t.code),
  index('writing_story_idx').on(t.storyId),
])

export const writingMentions = pgTable('writing_mentions', {
  id: serial('id').primaryKey(),
  writingId: integer('writing_id').notNull(),
  entryCollection: text('entry_collection').notNull(),
  entryId: integer('entry_id').notNull(),
}, (t) => [
  unique().on(t.writingId, t.entryCollection, t.entryId),
])

// ─── Relationships ────────────────────────────────────────────────────────────

export const relationships = pgTable('relationships', {
  id: serial('id').primaryKey(),
  code: text('code').unique().notNull(),
  fromCollection: text('from_collection').notNull(),
  fromId: integer('from_id').notNull(),
  fromCode: text('from_code').notNull(),
  toCollection: text('to_collection').notNull(),
  toId: integer('to_id').notNull(),
  toCode: text('to_code').notNull(),
  type: text('type').notNull().default('related_to'),
  notes: text('notes'),
  startYear: integer('start_year'),
  endYear: integer('end_year'),
  // Relative timing for a `follows` relationship: how many years after `toCode` that `fromCode` occurs.
  offsetYears: integer('offset_years'),
  title: text('title'),
  tagIds: jsonb('tag_ids').$type<number[]>().default(sql`'[]'::jsonb`),
  reviewNote: text('review_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('relationships_from_code_idx').on(t.fromCode),
  index('relationships_to_code_idx').on(t.toCode),
  index('relationships_code_idx').on(t.code),
])

// ─── Link index (derived, step G1) ───────────────────────────────────────────
// One row per connection between two coded records. Rebuilt from the records by
// lib/graph/sync.ts on every write; never edited by hand and never canon itself.
// `key` is deterministic (source:ownerCode:type:fieldName:fromCode:toCode) so a
// resync of the same state is a no-op. See traveler-wiki-build-plan.md "Link index".

export const links = pgTable('links', {
  id: serial('id').primaryKey(),
  key: text('key').unique().notNull(),
  fromCode: text('from_code').notNull(),
  fromCollection: text('from_collection').notNull(),
  toCode: text('to_code').notNull(),
  toCollection: text('to_collection').notNull(),
  source: text('source').notNull(), // relationship | field | parent | text | pin
  type: text('type').notNull(), // X relationship type value, or field name (involves, parent, mentions...)
  fieldName: text('field_name'), // where inside the owner, e.g. details.Origin, text, whatHappened
  ownerCode: text('owner_code').notNull(), // the record that holds the relationship/field/text
  directed: boolean('directed').notNull().default(true),
  startYear: integer('start_year'),
  endYear: integer('end_year'),
  broken: boolean('broken').notNull().default(false), // the target no longer exists
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('links_owner_idx').on(t.ownerCode),
  index('links_from_idx').on(t.fromCode),
  index('links_to_idx').on(t.toCode),
  index('links_broken_idx').on(t.broken),
])

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const tags = pgTable('tags', {
  id: serial('id').primaryKey(),
  code: text('code').unique().notNull(),
  name: text('name').unique().notNull(),
  description: text('description'),
  builtIn: boolean('built_in').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Media ────────────────────────────────────────────────────────────────────

export const media = pgTable('media', {
  id: serial('id').primaryKey(),
  filename: text('filename').notNull(),
  mimeType: text('mime_type'),
  filesize: integer('filesize'),
  width: integer('width'),
  height: integer('height'),
  alt: text('alt'),
  url: text('url'),
  sizes: jsonb('sizes').$type<Record<string, { url: string; width: number; height: number }>>()
    .default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Timeline settings (new, global, step W2) ────────────────────────────────
// One row, id fixed at 1. Read/created with an upsert, same pattern as counters.

export const timelineSettings = pgTable('timeline_settings', {
  id: integer('id').primaryKey(),
  scaleMode: text('scale_mode').notNull().default('to_scale'), // to_scale | in_sequence
  gaps: jsonb('gaps')
    .$type<{ fromYear: number; toYear: number; collapsedTo: number; label: string }[]>()
    .default(sql`'[]'::jsonb`),
  defaultZoomStart: integer('default_zoom_start'),
  defaultZoomEnd: integer('default_zoom_end'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Counters ─────────────────────────────────────────────────────────────────
// One row per code prefix. next is the next number to assign.
// Updated atomically with INSERT ... ON CONFLICT DO UPDATE.

export const counters = pgTable('counters', {
  id: serial('id').primaryKey(),
  prefix: text('prefix').unique().notNull(),
  next: integer('next').notNull().default(1),
})

// ─── Continuity (Phase 4, the continuity check port) ─────────────────────────
// One flag per finding the continuity check raises, or per automatic change it already made.
// kind: conflict | possible_change (decisions, wait for Bobby) | new_record | new_detail
// (updates, already applied with his own words, shown with Undo). status: open | resolved.
// choice (once resolved): keep_canon | update_canon | both_true | changed_over_time |
// decide_later | acknowledged | undone. See traveler-wiki-build-plan.md / PLAN_WRITING_AND_AI.md S7
// and CLAUDE.md hard rule 1.

export const continuity = pgTable('continuity', {
  id: serial('id').primaryKey(),
  code: text('code').unique().notNull(),
  writingId: integer('writing_id').notNull(),
  entryCollection: text('entry_collection').notNull(),
  entryId: integer('entry_id').notNull(),
  kind: text('kind').notNull(),
  fieldLabel: text('field_label').notNull(),
  existingExcerpt: text('existing_excerpt'),
  newQuote: text('new_quote').notNull(),
  explanation: text('explanation'),
  status: text('status').notNull().default('open'),
  choice: text('choice'),
  reason: text('reason'),
  context: text('context'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('continuity_writing_idx').on(t.writingId),
  index('continuity_entry_idx').on(t.entryCollection, t.entryId),
  index('continuity_status_idx').on(t.status),
])

// Every change a piece of writing or a decision made to a world entry's field: where each
// canon fact came from. action: created | added | updated | both_true | changed_over_time | undone.
export const continuityHistory = pgTable('continuity_history', {
  id: serial('id').primaryKey(),
  entryCollection: text('entry_collection').notNull(),
  entryId: integer('entry_id').notNull(),
  fieldLabel: text('field_label').notNull(),
  action: text('action').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  writingId: integer('writing_id'),
  flagId: integer('flag_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('continuity_history_entry_idx').on(t.entryCollection, t.entryId),
])

// A detail in a piece of writing that already matches canon. Logged quietly, no notification.
export const continuityConfirmations = pgTable('continuity_confirmations', {
  id: serial('id').primaryKey(),
  writingId: integer('writing_id').notNull(),
  entryCollection: text('entry_collection').notNull(),
  entryId: integer('entry_id').notNull(),
  fieldLabel: text('field_label').notNull(),
  quote: text('quote').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('continuity_confirmations_writing_idx').on(t.writingId),
])

// ─── Cultures join tables (kept as denorm columns in world tables, not separate) ─

// cultures.homelands and cultures.languages are many-to-many.
// Stored inline as JSONB arrays to keep queries simple (small sets).
// The culture row carries cultureHomelands and cultureLanguages as id arrays.
// This deviates from separate join tables intentionally: each culture has at most
// a handful of homelands/languages, never queried in isolation.
