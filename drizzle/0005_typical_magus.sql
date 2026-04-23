CREATE TABLE "berries" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"item_id" text NOT NULL,
	"flavours" jsonb NOT NULL,
	"dominant_flavour" text,
	"colour" text,
	"weight" real,
	"raw" jsonb NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "berries_slug_idx" ON "berries" USING btree ("slug");