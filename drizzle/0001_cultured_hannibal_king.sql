ALTER TYPE "public"."source_kind" ADD VALUE 'addon';--> statement-breakpoint
DROP INDEX "spawns_external_idx";--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "source_kind" "source_kind" DEFAULT 'mod' NOT NULL;--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "source_name" text DEFAULT 'cobblemon' NOT NULL;--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "source_url" text;--> statement-breakpoint
CREATE INDEX "spawns_source_idx" ON "spawns" USING btree ("source_kind","source_name");--> statement-breakpoint
CREATE UNIQUE INDEX "spawns_external_idx" ON "spawns" USING btree ("external_id","source_name");