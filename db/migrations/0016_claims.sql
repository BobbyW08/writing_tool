CREATE TABLE "claims" (
	"id" serial PRIMARY KEY NOT NULL,
	"writing_id" integer NOT NULL,
	"entry_collection" text NOT NULL,
	"entry_id" integer NOT NULL,
	"field_label" text NOT NULL,
	"quote" text NOT NULL,
	"implied_value" text NOT NULL,
	"source_canon_state" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "claims_entry_idx" ON "claims" USING btree ("entry_collection","entry_id");--> statement-breakpoint
CREATE INDEX "claims_writing_idx" ON "claims" USING btree ("writing_id");