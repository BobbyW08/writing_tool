CREATE TABLE "map_pin_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"map_pin_id" integer NOT NULL,
	"entry_collection" text NOT NULL,
	"entry_id" integer NOT NULL,
	CONSTRAINT "map_pin_links_map_pin_id_entry_collection_entry_id_unique" UNIQUE("map_pin_id","entry_collection","entry_id")
);
--> statement-breakpoint
CREATE TABLE "map_pins" (
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
	"map_id" integer NOT NULL,
	"shape" text DEFAULT 'pin' NOT NULL,
	"geometry" jsonb NOT NULL,
	"icon" text,
	"color" text,
	"group" text,
	"layer" text,
	"behavior" text DEFAULT 'popup' NOT NULL,
	"opens_map_id" integer,
	"year_from" integer,
	"year_to" integer,
	CONSTRAINT "map_pins_code_unique" UNIQUE("code"),
	CONSTRAINT "map_pins_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "maps" (
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
	"kind" text DEFAULT 'world' NOT NULL,
	"base_image_id" integer,
	"image_width" integer,
	"image_height" integer,
	"layers" jsonb DEFAULT '[]'::jsonb,
	"pin_groups" jsonb DEFAULT '[]'::jsonb,
	"min_zoom" integer,
	"max_zoom" integer,
	"start_view" jsonb,
	"location_id" integer,
	"year_from" integer,
	"year_to" integer,
	CONSTRAINT "maps_code_unique" UNIQUE("code"),
	CONSTRAINT "maps_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "map_pin_links_pin_idx" ON "map_pin_links" USING btree ("map_pin_id");--> statement-breakpoint
CREATE INDEX "map_pin_links_entry_idx" ON "map_pin_links" USING btree ("entry_collection","entry_id");--> statement-breakpoint
CREATE INDEX "map_pins_code_idx" ON "map_pins" USING btree ("code");--> statement-breakpoint
CREATE INDEX "map_pins_map_idx" ON "map_pins" USING btree ("map_id");--> statement-breakpoint
CREATE INDEX "maps_code_idx" ON "maps" USING btree ("code");--> statement-breakpoint
CREATE INDEX "maps_parent_idx" ON "maps" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "maps_location_idx" ON "maps" USING btree ("location_id");