CREATE TABLE "continuity_confirmations" (
	"id" serial PRIMARY KEY NOT NULL,
	"writing_id" integer NOT NULL,
	"entry_collection" text NOT NULL,
	"entry_id" integer NOT NULL,
	"field_label" text NOT NULL,
	"quote" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "continuity_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"entry_collection" text NOT NULL,
	"entry_id" integer NOT NULL,
	"field_label" text NOT NULL,
	"action" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"writing_id" integer,
	"flag_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "continuity" ADD COLUMN "writing_id" integer;--> statement-breakpoint
ALTER TABLE "continuity" ADD COLUMN "field_label" text;--> statement-breakpoint
ALTER TABLE "continuity" ADD COLUMN "existing_excerpt" text;--> statement-breakpoint
ALTER TABLE "continuity" ADD COLUMN "new_quote" text;--> statement-breakpoint
ALTER TABLE "continuity" ADD COLUMN "explanation" text;--> statement-breakpoint
ALTER TABLE "continuity" ADD COLUMN "status" text DEFAULT 'open';--> statement-breakpoint
ALTER TABLE "continuity" ADD COLUMN "choice" text;--> statement-breakpoint
ALTER TABLE "continuity" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "continuity" ADD COLUMN "context" text;--> statement-breakpoint
ALTER TABLE "continuity" ADD COLUMN "resolved_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "writing" ADD COLUMN "check_started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "writing" ADD COLUMN "checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "writing" ADD COLUMN "check_notes" text;--> statement-breakpoint
ALTER TABLE "writing" ADD COLUMN "check_error" text;--> statement-breakpoint
CREATE INDEX "continuity_confirmations_writing_idx" ON "continuity_confirmations" USING btree ("writing_id");--> statement-breakpoint
CREATE INDEX "continuity_history_entry_idx" ON "continuity_history" USING btree ("entry_collection","entry_id");--> statement-breakpoint
CREATE INDEX "continuity_writing_idx" ON "continuity" USING btree ("writing_id");--> statement-breakpoint
CREATE INDEX "continuity_entry_idx" ON "continuity" USING btree ("entry_collection","entry_id");--> statement-breakpoint
CREATE INDEX "continuity_status_idx" ON "continuity" USING btree ("status");