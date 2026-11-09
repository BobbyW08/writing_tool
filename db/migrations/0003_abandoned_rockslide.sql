ALTER TABLE "continuity" ALTER COLUMN "writing_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "continuity" ALTER COLUMN "entry_collection" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "continuity" ALTER COLUMN "entry_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "continuity" ALTER COLUMN "kind" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "continuity" ALTER COLUMN "field_label" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "continuity" ALTER COLUMN "new_quote" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "continuity" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "continuity" DROP COLUMN "note";--> statement-breakpoint
ALTER TABLE "continuity" DROP COLUMN "resolved";