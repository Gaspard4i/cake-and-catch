CREATE TABLE "site_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"stars" integer NOT NULL,
	"comment" text,
	"locale" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_stats" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"visits" integer DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"rating_sum" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "site_ratings_created_idx" ON "site_ratings" USING btree ("created_at");