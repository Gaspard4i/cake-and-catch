CREATE TABLE "spawn_presets" (
	"name" text PRIMARY KEY NOT NULL,
	"condition" jsonb,
	"anticondition" jsonb,
	"context" text,
	"raw" jsonb NOT NULL,
	"source_url" text
);
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "percentage" real;--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "weight_multipliers" jsonb;--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "composite_condition" jsonb;