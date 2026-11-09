CREATE TABLE "boards" (
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
	"kind" text DEFAULT 'node_map' NOT NULL,
	"root_codes" jsonb DEFAULT '[]'::jsonb,
	"query" jsonb DEFAULT '{"collections":[],"relationshipTypes":[],"sources":[],"direction":"both","depth":2,"yearFrom":null,"yearTo":null}'::jsonb,
	"layout_mode" text DEFAULT 'auto_tree' NOT NULL,
	"node_positions" jsonb DEFAULT '{}'::jsonb,
	"scene" jsonb,
	"viewport" jsonb,
	CONSTRAINT "boards_code_unique" UNIQUE("code"),
	CONSTRAINT "boards_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "boards_code_idx" ON "boards" USING btree ("code");--> statement-breakpoint
CREATE INDEX "boards_parent_idx" ON "boards" USING btree ("parent_id");