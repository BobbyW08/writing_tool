CREATE TABLE "ai_proposals" (
	"id" serial PRIMARY KEY NOT NULL,
	"task" text NOT NULL,
	"target_collection" text,
	"target_id" integer,
	"target_code" text,
	"kind" text NOT NULL,
	"field_label" text,
	"proposed_value" jsonb NOT NULL,
	"model" text NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"context_codes" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "ai_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"task" text NOT NULL,
	"model" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_settings_task_unique" UNIQUE("task")
);
--> statement-breakpoint
CREATE INDEX "ai_proposals_state_idx" ON "ai_proposals" USING btree ("state");--> statement-breakpoint
CREATE INDEX "ai_proposals_target_idx" ON "ai_proposals" USING btree ("target_collection","target_id");