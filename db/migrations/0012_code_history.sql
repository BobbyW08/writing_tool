CREATE TABLE "code_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"old_code" text NOT NULL,
	"new_code" text NOT NULL,
	"moved_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "code_history_old_code_unique" UNIQUE("old_code")
);
--> statement-breakpoint
CREATE INDEX "code_history_new_idx" ON "code_history" USING btree ("new_code");