CREATE TABLE "beat_involves" (
	"id" serial PRIMARY KEY NOT NULL,
	"beat_id" integer NOT NULL,
	"entry_collection" text NOT NULL,
	"entry_id" integer NOT NULL,
	CONSTRAINT "beat_involves_beat_id_entry_collection_entry_id_unique" UNIQUE("beat_id","entry_collection","entry_id")
);
--> statement-breakpoint
CREATE TABLE "beats" (
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
	"story_id" integer NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"start_year" integer,
	"year_label" text,
	"state" text DEFAULT 'idea' NOT NULL,
	"promoted_to_event_id" integer,
	CONSTRAINT "beats_code_unique" UNIQUE("code"),
	CONSTRAINT "beats_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "beat_involves_beat_idx" ON "beat_involves" USING btree ("beat_id");--> statement-breakpoint
CREATE INDEX "beat_involves_entry_idx" ON "beat_involves" USING btree ("entry_collection","entry_id");--> statement-breakpoint
CREATE INDEX "beats_code_idx" ON "beats" USING btree ("code");--> statement-breakpoint
CREATE INDEX "beats_story_idx" ON "beats" USING btree ("story_id");