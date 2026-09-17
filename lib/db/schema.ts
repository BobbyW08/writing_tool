import { pgTable, uuid, text, jsonb, numeric, timestamp, integer, unique } from "drizzle-orm/pg-core";

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
