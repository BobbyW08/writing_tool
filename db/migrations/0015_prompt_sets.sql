CREATE TABLE "prompt_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"collection" text NOT NULL,
	"group" text NOT NULL,
	"label" text NOT NULL,
	"question" text NOT NULL,
	"detail_label" text NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE INDEX "prompt_sets_collection_idx" ON "prompt_sets" USING btree ("collection");