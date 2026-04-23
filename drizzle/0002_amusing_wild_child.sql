CREATE TABLE "bait_effects" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"slug" text NOT NULL,
	"effects" jsonb NOT NULL,
	"raw" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasonings" (
	"id" serial PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"slug" text NOT NULL,
	"colour" text,
	"raw" jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bait_effects_slug_idx" ON "bait_effects" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "seasonings_slug_idx" ON "seasonings" USING btree ("slug");