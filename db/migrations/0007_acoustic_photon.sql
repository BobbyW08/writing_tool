CREATE TABLE "chronicles" (
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
	"map_periods" jsonb DEFAULT '[]'::jsonb,
	"era_ids" jsonb DEFAULT '[]'::jsonb,
	"filter" jsonb DEFAULT '{"collections":[],"tagIds":[],"involvesCodes":[]}'::jsonb,
	"start_year" integer,
	"end_year" integer,
	CONSTRAINT "chronicles_code_unique" UNIQUE("code"),
	CONSTRAINT "chronicles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_pins" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"map_pin_id" integer NOT NULL,
	CONSTRAINT "event_pins_event_id_map_pin_id_unique" UNIQUE("event_id","map_pin_id")
);
--> statement-breakpoint
CREATE INDEX "chronicles_code_idx" ON "chronicles" USING btree ("code");--> statement-breakpoint
CREATE INDEX "chronicles_parent_idx" ON "chronicles" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "event_pins_event_idx" ON "event_pins" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "event_pins_pin_idx" ON "event_pins" USING btree ("map_pin_id");