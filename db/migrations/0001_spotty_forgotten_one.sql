CREATE TABLE "links" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"from_code" text NOT NULL,
	"from_collection" text NOT NULL,
	"to_code" text NOT NULL,
	"to_collection" text NOT NULL,
	"source" text NOT NULL,
	"type" text NOT NULL,
	"field_name" text,
	"owner_code" text NOT NULL,
	"directed" boolean DEFAULT true NOT NULL,
	"start_year" integer,
	"end_year" integer,
	"broken" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "links_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "relationships" ADD COLUMN "offset_years" integer;--> statement-breakpoint
CREATE INDEX "links_owner_idx" ON "links" USING btree ("owner_code");--> statement-breakpoint
CREATE INDEX "links_from_idx" ON "links" USING btree ("from_code");--> statement-breakpoint
CREATE INDEX "links_to_idx" ON "links" USING btree ("to_code");--> statement-breakpoint
CREATE INDEX "links_broken_idx" ON "links" USING btree ("broken");