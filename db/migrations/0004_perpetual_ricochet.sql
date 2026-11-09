CREATE TABLE "eras" (
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
	"color" text,
	"kind" text DEFAULT 'era' NOT NULL,
	CONSTRAINT "eras_code_unique" UNIQUE("code"),
	CONSTRAINT "eras_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "timeline_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"scale_mode" text DEFAULT 'to_scale' NOT NULL,
	"gaps" jsonb DEFAULT '[]'::jsonb,
	"default_zoom_start" integer,
	"default_zoom_end" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "event_type" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "importance" text DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "lane" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "eras_code_idx" ON "eras" USING btree ("code");--> statement-breakpoint
CREATE INDEX "eras_parent_idx" ON "eras" USING btree ("parent_id");