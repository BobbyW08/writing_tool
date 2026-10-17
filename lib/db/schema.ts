import { pgTable, uuid, text, jsonb, numeric, timestamp, integer, unique, index, type AnyPgColumn } from "drizzle-orm/pg-core";

// Data model per traveler-wiki-build-plan.md Phase 1. Kept close to the plan's SQL
// verbatim so the two stay in sync — update both together if the schema changes.

export const entities = pgTable("entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(), // 'character' | 'location' | 'item' | 'culture' | 'race' | 'language' | 'artifact'
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  status: text("status").notNull(), // 'locked' | 'in_development' | 'needs_name' | 'placeholder'
  fields: jsonb("fields").$type<Record<string, string>>().notNull().default({}),
  gapPrompt: text("gap_prompt"), // only set when status = 'placeholder'
  sourceDocId: text("source_doc_id"), // which source file this came from, for round-tripping
  parentEntityId: uuid("parent_entity_id").references((): AnyPgColumn => entities.id), // optional generic sub-item hierarchy
});

export const events = pgTable("events", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").unique(), // stable key derived from title, for ingestion upserts
  yearLabel: text("year_label"), // display text, e.g. "Age ~350-400" — ranges/approximations OK
  sortOrder: numeric("sort_order"), // numeric position on the timeline axis; independent of yearLabel
  locationId: uuid("location_id").references(() => entities.id),
  whatHappened: text("what_happened"),
  whyItHappened: text("why_it_happened"),
  whatItCaused: text("what_it_caused"),
  whatWasLearned: text("what_was_learned"),
  draftText: text("draft_text"), // freeform scene/notes written in-app for this event
  sourceDocId: text("source_doc_id"), // which source file this came from, for round-tripping
  parentEventId: uuid("parent_event_id").references((): AnyPgColumn => events.id), // optional sub-event hierarchy
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const eventLinks = pgTable(
  "event_links",
  {
    eventId: uuid("event_id").notNull().references(() => events.id),
    entityId: uuid("entity_id").notNull().references(() => entities.id),
    role: text("role"), // optional: 'protagonist' | 'location' | 'item_involved' | ...
  },
  (table) => [unique().on(table.eventId, table.entityId)],
);

export const relationships = pgTable(
  "relationships",
  {
    entityIdA: uuid("entity_id_a").notNull().references(() => entities.id),
    entityIdB: uuid("entity_id_b").notNull().references(() => entities.id),
    label: text("label"), // optional context, e.g. "trained by" — derived from [[wiki-links]]
  },
  (table) => [unique().on(table.entityIdA, table.entityIdB)],
);

export const compilations = pgTable("compilations", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(), // e.g. "Chapter 7: Vashten's Final Years"
  type: text("type").notNull(), // 'age' | 'chapter' | 'custom'
  description: text("description"),
});

export const compilationItems = pgTable("compilation_items", {
  compilationId: uuid("compilation_id").notNull().references(() => compilations.id),
  eventId: uuid("event_id").references(() => events.id),
  entityId: uuid("entity_id").references(() => entities.id),
  position: integer("position").notNull(), // manual order within the compilation
});

// Snippet intake and continuity check (traveler-wiki-build-plan.md, Phase 3.6).
// A snippet is a piece of writing (scene, chapter, part) that gets read against canon.
// The entity records stay the official canon; these tables record where each piece of
// canon came from, what was confirmed, and what Bobby decided on every conflict.

export const snippets = pgTable("snippets", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  label: text("label"), // chapter or part label, e.g. "Chapter 3"
  body: text("body").notNull(),
  sortOrder: numeric("sort_order"), // where the scene sits on the timeline (same scale as events.sort_order)
  checkStatus: text("check_status").notNull().default("unchecked"), // 'unchecked' | 'checking' | 'checked' | 'failed'
  checkStartedAt: timestamp("check_started_at", { withTimezone: true }),
  checkedAt: timestamp("checked_at", { withTimezone: true }),
  checkError: text("check_error"),
  checkNotes: text("check_notes"), // e.g. how many findings were discarded because a quote could not be verified
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const continuityFlags = pgTable(
  "continuity_flags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    snippetId: uuid("snippet_id").notNull().references(() => snippets.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
    // 'conflict' | 'possible_change' need a decision. 'new_record' | 'new_detail' are
    // informational: the canon change was already applied and can be reviewed or undone.
    kind: text("kind").notNull(),
    fieldLabel: text("field_label").notNull(), // the canon field this is about
    existingExcerpt: text("existing_excerpt"), // exact words from canon (conflict, possible_change)
    newQuote: text("new_quote").notNull(), // exact words from the snippet
    explanation: text("explanation"), // one sentence on why the two disagree
    status: text("status").notNull().default("open"), // 'open' | 'resolved'
    // 'keep_canon' | 'update_canon' | 'both_true' | 'changed_over_time' | 'decide_later' | 'acknowledged' | 'undone'
    choice: text("choice"),
    reason: text("reason"),
    context: text("context"), // what makes both values true (both_true, changed_over_time)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [index("continuity_flags_status_idx").on(table.status), index("continuity_flags_snippet_idx").on(table.snippetId)],
);

// Every change a snippet or a decision made to an entity field, so any canon field can
// show where it came from and what it used to say.
export const fieldHistory = pgTable(
  "field_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityId: uuid("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
    fieldLabel: text("field_label").notNull(),
    action: text("action").notNull(), // 'created' | 'added' | 'updated' | 'both_true' | 'changed_over_time' | 'undone'
    oldValue: text("old_value"),
    newValue: text("new_value"),
    snippetId: uuid("snippet_id").references(() => snippets.id, { onDelete: "set null" }),
    flagId: uuid("flag_id").references(() => continuityFlags.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("field_history_entity_idx").on(table.entityId)],
);

// A detail in a snippet that already matches canon. Logged quietly, no notification.
export const snippetConfirmations = pgTable(
  "snippet_confirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    snippetId: uuid("snippet_id").notNull().references(() => snippets.id, { onDelete: "cascade" }),
    entityId: uuid("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
    fieldLabel: text("field_label").notNull(),
    quote: text("quote").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("snippet_confirmations_snippet_idx").on(table.snippetId)],
);
