CREATE TABLE "characters" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"status" text DEFAULT 'in_development' NOT NULL,
	"gap_prompt" text,
	"review_note" text,
	"tag_ids" jsonb DEFAULT '[]'::jsonb,
	"source_doc_id" text,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"details" jsonb DEFAULT '[]'::jsonb,
	"body" text,
	"parent_id" integer,
	"image_id" integer,
	"role" text,
	"birth_year" integer,
	"death_year" integer,
	"birthplace_id" integer,
	"race_id" integer,
	"culture_id" integer,
	CONSTRAINT "characters_code_unique" UNIQUE("code"),
	CONSTRAINT "characters_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "continuity" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"entry_collection" text,
	"entry_id" integer,
	"kind" text,
	"note" text,
	"resolved" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "continuity_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "counters" (
	"id" serial PRIMARY KEY NOT NULL,
	"prefix" text NOT NULL,
	"next" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "counters_prefix_unique" UNIQUE("prefix")
);
--> statement-breakpoint
CREATE TABLE "cultures" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"status" text DEFAULT 'in_development' NOT NULL,
	"gap_prompt" text,
	"review_note" text,
	"tag_ids" jsonb DEFAULT '[]'::jsonb,
	"source_doc_id" text,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"details" jsonb DEFAULT '[]'::jsonb,
	"body" text,
	"parent_id" integer,
	"image_id" integer,
	"founded_year" integer,
	"ended_year" integer,
	"homeland_ids" jsonb DEFAULT '[]'::jsonb,
	"culture_language_ids" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "cultures_code_unique" UNIQUE("code"),
	CONSTRAINT "cultures_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_involves" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"entry_collection" text NOT NULL,
	"entry_id" integer NOT NULL,
	CONSTRAINT "event_involves_event_id_entry_collection_entry_id_unique" UNIQUE("event_id","entry_collection","entry_id")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"status" text DEFAULT 'in_development' NOT NULL,
	"gap_prompt" text,
	"review_note" text,
	"tag_ids" jsonb DEFAULT '[]'::jsonb,
	"source_doc_id" text,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"details" jsonb DEFAULT '[]'::jsonb,
	"body" text,
	"parent_id" integer,
	"image_id" integer,
	"start_year" integer,
	"end_year" integer,
	"year_label" text,
	"sort_order" integer DEFAULT 0,
	"location_id" integer,
	"what_happened" text,
	"why_it_happened" text,
	"what_it_caused" text,
	"what_was_learned" text,
	CONSTRAINT "events_code_unique" UNIQUE("code"),
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "factions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"status" text DEFAULT 'in_development' NOT NULL,
	"gap_prompt" text,
	"review_note" text,
	"tag_ids" jsonb DEFAULT '[]'::jsonb,
	"source_doc_id" text,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"details" jsonb DEFAULT '[]'::jsonb,
	"body" text,
	"parent_id" integer,
	"image_id" integer,
	"kind" text,
	"culture_id" integer,
	"founded_year" integer,
	"ended_year" integer,
	CONSTRAINT "factions_code_unique" UNIQUE("code"),
	CONSTRAINT "factions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"status" text DEFAULT 'in_development' NOT NULL,
	"gap_prompt" text,
	"review_note" text,
	"tag_ids" jsonb DEFAULT '[]'::jsonb,
	"source_doc_id" text,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"details" jsonb DEFAULT '[]'::jsonb,
	"body" text,
	"parent_id" integer,
	"image_id" integer,
	"item_type" text,
	"created_year" integer,
	"current_owner_id" integer,
	"current_location_id" integer,
	CONSTRAINT "items_code_unique" UNIQUE("code"),
	CONSTRAINT "items_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"status" text DEFAULT 'in_development' NOT NULL,
	"gap_prompt" text,
	"review_note" text,
	"tag_ids" jsonb DEFAULT '[]'::jsonb,
	"source_doc_id" text,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"details" jsonb DEFAULT '[]'::jsonb,
	"body" text,
	"parent_id" integer,
	"image_id" integer,
	CONSTRAINT "languages_code_unique" UNIQUE("code"),
	CONSTRAINT "languages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"status" text DEFAULT 'in_development' NOT NULL,
	"gap_prompt" text,
	"review_note" text,
	"tag_ids" jsonb DEFAULT '[]'::jsonb,
	"source_doc_id" text,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"details" jsonb DEFAULT '[]'::jsonb,
	"body" text,
	"parent_id" integer,
	"image_id" integer,
	"kind" text,
	"culture_id" integer,
	CONSTRAINT "locations_code_unique" UNIQUE("code"),
	CONSTRAINT "locations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "lore" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"status" text DEFAULT 'in_development' NOT NULL,
	"gap_prompt" text,
	"review_note" text,
	"tag_ids" jsonb DEFAULT '[]'::jsonb,
	"source_doc_id" text,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"details" jsonb DEFAULT '[]'::jsonb,
	"body" text,
	"parent_id" integer,
	"image_id" integer,
	"category" text,
	CONSTRAINT "lore_code_unique" UNIQUE("code"),
	CONSTRAINT "lore_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" serial PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text,
	"filesize" integer,
	"width" integer,
	"height" integer,
	"alt" text,
	"url" text,
	"sizes" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "races" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"status" text DEFAULT 'in_development' NOT NULL,
	"gap_prompt" text,
	"review_note" text,
	"tag_ids" jsonb DEFAULT '[]'::jsonb,
	"source_doc_id" text,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"details" jsonb DEFAULT '[]'::jsonb,
	"body" text,
	"parent_id" integer,
	"image_id" integer,
	CONSTRAINT "races_code_unique" UNIQUE("code"),
	CONSTRAINT "races_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"from_collection" text NOT NULL,
	"from_id" integer NOT NULL,
	"from_code" text NOT NULL,
	"to_collection" text NOT NULL,
	"to_id" integer NOT NULL,
	"to_code" text NOT NULL,
	"type" text DEFAULT 'related_to' NOT NULL,
	"notes" text,
	"start_year" integer,
	"end_year" integer,
	"title" text,
	"tag_ids" jsonb DEFAULT '[]'::jsonb,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "relationships_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"summary" text,
	"status" text DEFAULT 'in_development' NOT NULL,
	"gap_prompt" text,
	"review_note" text,
	"tag_ids" jsonb DEFAULT '[]'::jsonb,
	"source_doc_id" text,
	"legacy_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"body" text,
	"image_id" integer,
	"stage" text DEFAULT 'idea',
	"format" text,
	"era" text,
	"start_year" integer,
	"end_year" integer,
	"year_label" text,
	"floating" boolean DEFAULT false,
	"catalog_number" integer,
	CONSTRAINT "stories_code_unique" UNIQUE("code"),
	CONSTRAINT "stories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "story_dramatizes" (
	"id" serial PRIMARY KEY NOT NULL,
	"story_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	CONSTRAINT "story_dramatizes_story_id_event_id_unique" UNIQUE("story_id","event_id")
);
--> statement-breakpoint
CREATE TABLE "story_involves" (
	"id" serial PRIMARY KEY NOT NULL,
	"story_id" integer NOT NULL,
	"entry_collection" text NOT NULL,
	"entry_id" integer NOT NULL,
	CONSTRAINT "story_involves_story_id_entry_collection_entry_id_unique" UNIQUE("story_id","entry_collection","entry_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"built_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_code_unique" UNIQUE("code"),
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "writing" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"canon_state" text DEFAULT 'draft' NOT NULL,
	"kind" text DEFAULT 'snippet',
	"story_id" integer,
	"order" integer DEFAULT 0,
	"start_year" integer,
	"text" text,
	"plain_text" text,
	"tag_ids" jsonb DEFAULT '[]'::jsonb,
	"review_note" text,
	"source_doc_id" text,
	"legacy_id" text,
	"check_status" text DEFAULT 'unchecked',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "writing_code_unique" UNIQUE("code"),
	CONSTRAINT "writing_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "writing_mentions" (
	"id" serial PRIMARY KEY NOT NULL,
	"writing_id" integer NOT NULL,
	"entry_collection" text NOT NULL,
	"entry_id" integer NOT NULL,
	CONSTRAINT "writing_mentions_writing_id_entry_collection_entry_id_unique" UNIQUE("writing_id","entry_collection","entry_id")
);
--> statement-breakpoint
CREATE INDEX "characters_code_idx" ON "characters" USING btree ("code");--> statement-breakpoint
CREATE INDEX "characters_legacy_idx" ON "characters" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "characters_parent_idx" ON "characters" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "cultures_code_idx" ON "cultures" USING btree ("code");--> statement-breakpoint
CREATE INDEX "cultures_legacy_idx" ON "cultures" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "event_involves_event_idx" ON "event_involves" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_involves_entry_idx" ON "event_involves" USING btree ("entry_collection","entry_id");--> statement-breakpoint
CREATE INDEX "events_code_idx" ON "events" USING btree ("code");--> statement-breakpoint
CREATE INDEX "events_start_year_idx" ON "events" USING btree ("start_year");--> statement-breakpoint
CREATE INDEX "events_legacy_idx" ON "events" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "factions_code_idx" ON "factions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "factions_legacy_idx" ON "factions" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "items_code_idx" ON "items" USING btree ("code");--> statement-breakpoint
CREATE INDEX "items_legacy_idx" ON "items" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "languages_code_idx" ON "languages" USING btree ("code");--> statement-breakpoint
CREATE INDEX "languages_legacy_idx" ON "languages" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "locations_code_idx" ON "locations" USING btree ("code");--> statement-breakpoint
CREATE INDEX "locations_legacy_idx" ON "locations" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "locations_parent_idx" ON "locations" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "lore_code_idx" ON "lore" USING btree ("code");--> statement-breakpoint
CREATE INDEX "lore_legacy_idx" ON "lore" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "races_code_idx" ON "races" USING btree ("code");--> statement-breakpoint
CREATE INDEX "races_legacy_idx" ON "races" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "relationships_from_code_idx" ON "relationships" USING btree ("from_code");--> statement-breakpoint
CREATE INDEX "relationships_to_code_idx" ON "relationships" USING btree ("to_code");--> statement-breakpoint
CREATE INDEX "relationships_code_idx" ON "relationships" USING btree ("code");--> statement-breakpoint
CREATE INDEX "stories_code_idx" ON "stories" USING btree ("code");--> statement-breakpoint
CREATE INDEX "stories_legacy_idx" ON "stories" USING btree ("legacy_id");--> statement-breakpoint
CREATE INDEX "writing_code_idx" ON "writing" USING btree ("code");--> statement-breakpoint
CREATE INDEX "writing_story_idx" ON "writing" USING btree ("story_id");