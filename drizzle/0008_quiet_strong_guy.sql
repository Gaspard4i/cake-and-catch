ALTER TABLE "berries" ADD COLUMN "snack_positionings" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "berries" ADD COLUMN "fruit_model" text;--> statement-breakpoint
ALTER TABLE "berries" ADD COLUMN "fruit_texture" text;