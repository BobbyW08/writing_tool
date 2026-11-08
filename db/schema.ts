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
}, (t) => [
  index('events_code_idx').on(t.code),
  index('events_start_year_idx').on(t.startYear),
  index('events_legacy_idx').on(t.legacyId),
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
  checkStatus: text('check_status').default('unchecked'),
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

// ─── Counters ─────────────────────────────────────────────────────────────────
// One row per code prefix. next is the next number to assign.
// Updated atomically with INSERT ... ON CONFLICT DO UPDATE.

export const counters = pgTable('counters', {
  id: serial('id').primaryKey(),
  prefix: text('prefix').unique().notNull(),
  next: integer('next').notNull().default(1),
})

// ─── Continuity (schema only, Phase 4) ───────────────────────────────────────

export const continuity = pgTable('continuity', {
  id: serial('id').primaryKey(),
  code: text('code').unique().notNull(),
  entryCollection: text('entry_collection'),
  entryId: integer('entry_id'),
  kind: text('kind'),
  note: text('note'),
  resolved: boolean('resolved').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Cultures join tables (kept as denorm columns in world tables, not separate) ─

// cultures.homelands and cultures.languages are many-to-many.
// Stored inline as JSONB arrays to keep queries simple (small sets).
// The culture row carries cultureHomelands and cultureLanguages as id arrays.
// This deviates from separate join tables intentionally: each culture has at most
// a handful of homelands/languages, never queried in isolation.
