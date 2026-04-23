CREATE TYPE "public"."bucket" AS ENUM('common', 'uncommon', 'rare', 'ultra-rare');--> statement-breakpoint
CREATE TYPE "public"."source_kind" AS ENUM('mod', 'wiki', 'derived');--> statement-breakpoint
CREATE TABLE "data_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" integer NOT NULL,
	"kind" "source_kind" NOT NULL,
	"url" text NOT NULL,
	"commit_sha" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "spawns" (
	"id" serial PRIMARY KEY NOT NULL,
	"species_id" integer NOT NULL,
	"external_id" text NOT NULL,
	"bucket" "bucket" NOT NULL,
	"weight" real NOT NULL,
	"level_min" integer NOT NULL,
	"level_max" integer NOT NULL,
	"context" text,
	"biomes" jsonb NOT NULL,
	"condition" jsonb,
	"anticondition" jsonb,
	"presets" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "species" (
	"id" serial PRIMARY KEY NOT NULL,
	"dex_no" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"primary_type" text NOT NULL,
	"secondary_type" text,
	"base_stats" jsonb NOT NULL,
	"abilities" jsonb NOT NULL,
	"catch_rate" integer NOT NULL,
	"base_friendship" integer,
	"preferred_flavours" jsonb,
	"labels" jsonb NOT NULL,
	"raw" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "spawns" ADD CONSTRAINT "spawns_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "data_sources_entity_idx" ON "data_sources" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "spawns_external_idx" ON "spawns" USING btree ("external_id");--> statement-breakpoint
CREATE INDEX "spawns_species_idx" ON "spawns" USING btree ("species_id");--> statement-breakpoint
CREATE UNIQUE INDEX "species_slug_idx" ON "species" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "species_dex_idx" ON "species" USING btree ("dex_no");