-- Reset of the spawn / world-graph layer to a clean Cobblemon-only model.
-- The schema files moved away from `mod_dimensions / dimension_biomes /
-- biome_structures` to a relational `mods → dimensions → biome_tags
-- (+ biome_tag_members) → biome_tag_structures` shape, plus scalar
-- columns on `spawns` so the matcher runs in a single SELECT.

-- 1. Drop legacy world-graph tables (they used different keys).
DROP TABLE IF EXISTS "biome_structures" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "dimension_biomes" CASCADE;
--> statement-breakpoint
DROP TABLE IF EXISTS "mod_dimensions" CASCADE;
--> statement-breakpoint
-- `mods` is reused but the row shape changes (locked becomes boolean).
ALTER TABLE "mods" ALTER COLUMN "locked" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "mods" ALTER COLUMN "locked" TYPE boolean USING ("locked"::int <> 0);
--> statement-breakpoint
ALTER TABLE "mods" ALTER COLUMN "locked" SET DEFAULT false;
--> statement-breakpoint

-- 2. Empty out the spawn data so we can reshape `spawns` without
--    dragging the legacy rows along. Auth / recipe / berry tables are
--    untouched.
TRUNCATE TABLE "data_sources" RESTART IDENTITY CASCADE;
--> statement-breakpoint
TRUNCATE TABLE "species_wiki" RESTART IDENTITY CASCADE;
--> statement-breakpoint
TRUNCATE TABLE "spawns" RESTART IDENTITY CASCADE;
--> statement-breakpoint
TRUNCATE TABLE "spawn_presets" CASCADE;
--> statement-breakpoint
TRUNCATE TABLE "species" RESTART IDENTITY CASCADE;
--> statement-breakpoint
TRUNCATE TABLE "mods" CASCADE;
--> statement-breakpoint

-- 3. species: regional variant linkage.
ALTER TABLE "species" ADD COLUMN "variant_of_species_id" integer;
--> statement-breakpoint
ALTER TABLE "species" ADD COLUMN "variant_label" text;
--> statement-breakpoint
ALTER TABLE "species" ADD CONSTRAINT "species_variant_of_species_id_fk"
  FOREIGN KEY ("variant_of_species_id") REFERENCES "species"("id") ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX "species_variant_of_idx" ON "species" USING btree ("variant_of_species_id");
--> statement-breakpoint

-- 4. spawns: scalar filter axes.
ALTER TABLE "spawns" ADD COLUMN "position_type" text;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "condition_dimensions" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "condition_biome_tags" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "condition_structures" jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "fluid" text;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "fluid_is_source" boolean;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "min_depth" integer;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "max_depth" integer;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "requires_rain" boolean;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "requires_thunder" boolean;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "requires_can_see_sky" boolean;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "min_sky_light" integer;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "max_sky_light" integer;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "min_light" integer;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "max_light" integer;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "min_moon_phase" integer;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "max_moon_phase" integer;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "time_range" text;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "min_y" integer;
--> statement-breakpoint
ALTER TABLE "spawns" ADD COLUMN "max_y" integer;
--> statement-breakpoint
-- Drop the legacy `context` column (replaced by `position_type`).
ALTER TABLE "spawns" DROP COLUMN IF EXISTS "context";
--> statement-breakpoint

-- 5. New world-graph tables.
CREATE TABLE "dimensions" (
  "id" text PRIMARY KEY NOT NULL,
  "mod_id" text NOT NULL REFERENCES "mods"("id") ON DELETE cascade,
  "label" text NOT NULL,
  "has_day_cycle" boolean NOT NULL DEFAULT true,
  "has_weather" boolean NOT NULL DEFAULT true,
  "has_moon" boolean NOT NULL DEFAULT true,
  "has_sky" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 100
);
--> statement-breakpoint
CREATE INDEX "dimensions_mod_idx" ON "dimensions" USING btree ("mod_id");
--> statement-breakpoint

CREATE TABLE "biome_tags" (
  "id" text PRIMARY KEY NOT NULL,
  "label" text NOT NULL,
  "dimension_id" text REFERENCES "dimensions"("id") ON DELETE set null,
  "section" text,
  "sort_order" integer NOT NULL DEFAULT 100
);
--> statement-breakpoint
CREATE INDEX "biome_tags_dim_idx" ON "biome_tags" USING btree ("dimension_id");
--> statement-breakpoint

CREATE TABLE "biome_tag_members" (
  "tag_id" text NOT NULL REFERENCES "biome_tags"("id") ON DELETE cascade,
  "biome_id" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "biome_tag_members_idx" ON "biome_tag_members" USING btree ("tag_id","biome_id");
--> statement-breakpoint
CREATE INDEX "biome_tag_members_biome_idx" ON "biome_tag_members" USING btree ("biome_id");
--> statement-breakpoint

CREATE TABLE "structures" (
  "id" text PRIMARY KEY NOT NULL,
  "label" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 100
);
--> statement-breakpoint

CREATE TABLE "biome_tag_structures" (
  "biome_tag_id" text NOT NULL REFERENCES "biome_tags"("id") ON DELETE cascade,
  "structure_id" text NOT NULL REFERENCES "structures"("id") ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX "biome_tag_structures_idx" ON "biome_tag_structures" USING btree ("biome_tag_id","structure_id");
--> statement-breakpoint
CREATE INDEX "biome_tag_structures_struct_idx" ON "biome_tag_structures" USING btree ("structure_id");
