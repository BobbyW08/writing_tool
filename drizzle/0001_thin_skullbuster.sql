ALTER TABLE "events" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "source_doc_id" text;--> statement-breakpoint
ALTER TABLE "event_links" ADD CONSTRAINT "event_links_event_id_entity_id_unique" UNIQUE("event_id","entity_id");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_slug_unique" UNIQUE("slug");--> statement-breakpoint
ALTER TABLE "relationships" ADD CONSTRAINT "relationships_entity_id_a_entity_id_b_unique" UNIQUE("entity_id_a","entity_id_b");