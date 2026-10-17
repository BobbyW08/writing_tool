CREATE TABLE "continuity_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snippet_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"field_label" text NOT NULL,
	"existing_excerpt" text,
	"new_quote" text NOT NULL,
	"explanation" text,
	"status" text DEFAULT 'open' NOT NULL,
	"choice" text,
	"reason" text,
	"context" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "field_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"field_label" text NOT NULL,
	"action" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"snippet_id" uuid,
	"flag_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snippet_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snippet_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"field_label" text NOT NULL,
	"quote" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snippets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"label" text,
	"body" text NOT NULL,
	"sort_order" numeric,
	"check_status" text DEFAULT 'unchecked' NOT NULL,
	"check_started_at" timestamp with time zone,
	"checked_at" timestamp with time zone,
	"check_error" text,
	"check_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "continuity_flags" ADD CONSTRAINT "continuity_flags_snippet_id_snippets_id_fk" FOREIGN KEY ("snippet_id") REFERENCES "public"."snippets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "continuity_flags" ADD CONSTRAINT "continuity_flags_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_history" ADD CONSTRAINT "field_history_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_history" ADD CONSTRAINT "field_history_snippet_id_snippets_id_fk" FOREIGN KEY ("snippet_id") REFERENCES "public"."snippets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "field_history" ADD CONSTRAINT "field_history_flag_id_continuity_flags_id_fk" FOREIGN KEY ("flag_id") REFERENCES "public"."continuity_flags"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snippet_confirmations" ADD CONSTRAINT "snippet_confirmations_snippet_id_snippets_id_fk" FOREIGN KEY ("snippet_id") REFERENCES "public"."snippets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snippet_confirmations" ADD CONSTRAINT "snippet_confirmations_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "continuity_flags_status_idx" ON "continuity_flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX "continuity_flags_snippet_idx" ON "continuity_flags" USING btree ("snippet_id");--> statement-breakpoint
CREATE INDEX "field_history_entity_idx" ON "field_history" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "snippet_confirmations_snippet_idx" ON "snippet_confirmations" USING btree ("snippet_id");