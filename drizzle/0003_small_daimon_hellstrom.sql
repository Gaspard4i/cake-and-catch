CREATE TYPE "public"."recipe_kind" AS ENUM('cake', 'bait', 'snack', 'aprijuice', 'other');--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"kind" "recipe_kind" NOT NULL,
	"result_id" text NOT NULL,
	"result_count" integer DEFAULT 1 NOT NULL,
	"shape" text NOT NULL,
	"grid" jsonb,
	"ingredients" jsonb,
	"seasoning_tag" text,
	"seasoning_processors" jsonb NOT NULL,
	"raw" jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_slug_idx" ON "recipes" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "recipes_kind_idx" ON "recipes" USING btree ("kind");