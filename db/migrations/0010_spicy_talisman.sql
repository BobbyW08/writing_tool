CREATE TABLE "compilations" (
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
	"kind" text DEFAULT 'custom' NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb,
	CONSTRAINT "compilations_code_unique" UNIQUE("code"),
	CONSTRAINT "compilations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "compilations_code_idx" ON "compilations" USING btree ("code");--> statement-breakpoint
CREATE INDEX "compilations_parent_idx" ON "compilations" USING btree ("parent_id");