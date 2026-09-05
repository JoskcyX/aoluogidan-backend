CREATE TABLE IF NOT EXISTS "page_hero_images" (
	"page_key" varchar(50) PRIMARY KEY NOT NULL,
	"image_url" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "firm_name" SET DEFAULT 'A. Oluogidan & Co';--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "site_title" SET DEFAULT 'A. Oluogidan & Co';