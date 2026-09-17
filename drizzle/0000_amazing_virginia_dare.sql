CREATE TABLE "compilation_items" (
	"compilation_id" uuid NOT NULL,
	"event_id" uuid,
	"entity_id" uuid,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compilations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text NOT NULL,
	"fields" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"gap_prompt" text,
	"source_doc_id" text,
	CONSTRAINT "entities_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "event_links" (
	"event_id" uuid NOT NULL,
	"entity_id" uuid NOT NULL,
	"role" text
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"year_label" text,
	"sort_order" numeric,
	"location_id" uuid,
	"what_happened" text,
	"why_it_happened" text,
	"what_it_caused" text,
	"what_was_learned" text,
	"draft_text" text,
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "relationships" (
	"entity_id_a" uuid NOT NULL,
	"entity_id_b" uuid NOT NULL,
	"label" text
);
--> statement-breakpoint
ALTER TABLE "compilation_items" ADD CONSTRAINT "compilation_items_compilation_id_compilations_id_fk" FOREIGN KEY ("compilation_id") REFERENCES "public"."compilations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compilation_items" ADD CONSTRAINT "compilation_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compilation_items" ADD CONSTRAINT "compilation_items_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_links" ADD CONSTRAINT "event_links_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_links" ADD CONSTRAINT "event_links_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_location_id_entities_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_entity_id_a_entities_id_fk" FOREIGN KEY ("entity_id_a") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_entity_id_b_entities_id_fk" FOREIGN KEY ("entity_id_b") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;