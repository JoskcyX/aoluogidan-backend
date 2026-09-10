DO $$ BEGIN
 CREATE TYPE "public"."internship_status" AS ENUM('NEW', 'REVIEWED', 'SHORTLISTED', 'REJECTED', 'ACCEPTED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "internship_applications" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"files" jsonb NOT NULL,
	"status" "internship_status" DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
