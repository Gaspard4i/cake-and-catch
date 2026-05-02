CREATE TABLE "biome_structures" (
	"biome_id" text NOT NULL,
	"structure_id" text NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dimension_biomes" (
	"dimension_id" text NOT NULL,
	"biome_id" text NOT NULL,
	"label" text NOT NULL,
	"section" text,
	"sort_order" integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mod_dimensions" (
	"mod_id" text NOT NULL,
	"dimension_id" text NOT NULL,
	"label" text NOT NULL,
	"has_day_cycle" integer DEFAULT 1 NOT NULL,
	"has_weather" integer DEFAULT 1 NOT NULL,
	"has_moon" integer DEFAULT 1 NOT NULL,
	"has_sky" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mods" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 100 NOT NULL,
	"locked" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mod_dimensions" ADD CONSTRAINT "mod_dimensions_mod_id_mods_id_fk" FOREIGN KEY ("mod_id") REFERENCES "public"."mods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "biome_structures_idx" ON "biome_structures" USING btree ("biome_id","structure_id");--> statement-breakpoint
CREATE INDEX "biome_structures_struct_idx" ON "biome_structures" USING btree ("structure_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dimension_biomes_idx" ON "dimension_biomes" USING btree ("dimension_id","biome_id");--> statement-breakpoint
CREATE INDEX "dimension_biomes_biome_idx" ON "dimension_biomes" USING btree ("biome_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mod_dimensions_idx" ON "mod_dimensions" USING btree ("mod_id","dimension_id");--> statement-breakpoint
CREATE INDEX "mod_dimensions_dim_idx" ON "mod_dimensions" USING btree ("dimension_id");