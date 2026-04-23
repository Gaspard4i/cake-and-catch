CREATE TABLE "species_wiki" (
	"id" serial PRIMARY KEY NOT NULL,
	"species_id" integer NOT NULL,
	"page_title" text NOT NULL,
	"page_url" text NOT NULL,
	"summary" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "species_wiki" ADD CONSTRAINT "species_wiki_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "species_wiki_species_idx" ON "species_wiki" USING btree ("species_id");