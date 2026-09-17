ALTER TABLE "entities" ADD COLUMN "parent_entity_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "parent_event_id" uuid;--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_parent_entity_id_entities_id_fk" FOREIGN KEY ("parent_entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_parent_event_id_events_id_fk" FOREIGN KEY ("parent_event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;