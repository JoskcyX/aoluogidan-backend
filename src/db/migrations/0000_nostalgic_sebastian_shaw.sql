DO $$ BEGIN
 CREATE TYPE "public"."content_status" AS ENUM('DRAFT', 'PUBLISHED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."enquiry_status" AS ENUM('NEW', 'CONTACTED', 'IN_PROGRESS', 'RESOLVED', 'ARCHIVED');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."enquiry_type" AS ENUM('CONTACT', 'CONSULTATION');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."role" AS ENUM('SUPER_ADMIN', 'EDITOR');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "about_content" (
	"id" varchar(20) PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"intro_heading" varchar(255) DEFAULT 'About Our Firm' NOT NULL,
	"intro_text" text,
	"history_text" text,
	"mission_text" text,
	"vision_text" text,
	"approach_text" text,
	"why_clients_text" text,
	"cta_text" varchar(100) DEFAULT 'Speak With Our Team' NOT NULL,
	"cta_link" varchar(255) DEFAULT '/consultation' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"user_id" varchar(128),
	"user_name" varchar(200) NOT NULL,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100) NOT NULL,
	"resource_id" varchar(128),
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_categories" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"slug" varchar(170) NOT NULL,
	CONSTRAINT "blog_categories_name_unique" UNIQUE("name"),
	CONSTRAINT "blog_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_post_tags" (
	"blog_post_id" varchar(128) NOT NULL,
	"tag_id" varchar(128) NOT NULL,
	CONSTRAINT "blog_post_tags_blog_post_id_tag_id_pk" PRIMARY KEY("blog_post_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_posts" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"slug" varchar(320) NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"featured_image_url" text,
	"author_id" varchar(128) NOT NULL,
	"category_id" varchar(128),
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp,
	"seo_title" varchar(255),
	"seo_description" text,
	"canonical_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "blog_tags" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(120) NOT NULL,
	CONSTRAINT "blog_tags_name_unique" UNIQUE("name"),
	CONSTRAINT "blog_tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "core_values" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "enquiries" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"type" "enquiry_type" NOT NULL,
	"full_name" varchar(200) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"subject" varchar(300),
	"area_of_law" varchar(200),
	"message" text NOT NULL,
	"preferred_contact_method" varchar(50),
	"preferred_date" timestamp,
	"preferred_time" varchar(50),
	"status" "enquiry_status" DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "faqs" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"question" varchar(500) NOT NULL,
	"answer" text NOT NULL,
	"category" varchar(150),
	"practice_area_id" varchar(128),
	"display_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lawyer_practice_areas" (
	"lawyer_id" varchar(128) NOT NULL,
	"practice_area_id" varchar(128) NOT NULL,
	CONSTRAINT "lawyer_practice_areas_lawyer_id_practice_area_id_pk" PRIMARY KEY("lawyer_id","practice_area_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "lawyers" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"position" varchar(200) NOT NULL,
	"photo_url" text,
	"bio_short" text,
	"bio" text,
	"education" text,
	"qualifications" text,
	"experience_years" integer,
	"memberships" text,
	"awards" text,
	"certifications" text,
	"languages" varchar(300),
	"linkedin_url" text,
	"email" varchar(255),
	"phone" varchar(50),
	"published" boolean DEFAULT false NOT NULL,
	"featured_home" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"seo_title" varchar(255),
	"seo_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lawyers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "media" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"filename" varchar(500) NOT NULL,
	"url" text NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"alt" varchar(255),
	"uploaded_by_id" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pages" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"slug" varchar(150) NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "practice_area_services" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"practice_area_id" varchar(128) NOT NULL,
	"name" varchar(255) NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "practice_areas" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"slug" varchar(220) NOT NULL,
	"short_description" text NOT NULL,
	"full_description" text,
	"image_url" text,
	"icon_name" varchar(100) DEFAULT 'scale',
	"published" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"seo_title" varchar(255),
	"seo_description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "practice_areas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "site_settings" (
	"id" varchar(20) PRIMARY KEY DEFAULT 'singleton' NOT NULL,
	"firm_name" varchar(255) DEFAULT 'Harcourt & Vale LLP' NOT NULL,
	"logo_url" text,
	"tagline" varchar(255),
	"description" text,
	"email" varchar(255) DEFAULT 'info@example.com' NOT NULL,
	"phone" varchar(50) DEFAULT '+1 (555) 000-0000' NOT NULL,
	"whatsapp" varchar(50),
	"address" text,
	"working_hours" text,
	"social_linkedin" text,
	"social_facebook" text,
	"social_instagram" text,
	"social_x" text,
	"social_youtube" text,
	"hero_heading" varchar(300) DEFAULT 'Strategic Legal Counsel. Trusted Representation.' NOT NULL,
	"hero_subheading" text,
	"hero_image_url" text,
	"hero_cta_text" varchar(100) DEFAULT 'Book a Consultation' NOT NULL,
	"hero_cta_link" varchar(255) DEFAULT '/consultation' NOT NULL,
	"hero_secondary_cta_text" varchar(100) DEFAULT 'Explore Our Practice Areas' NOT NULL,
	"hero_secondary_cta_link" varchar(255) DEFAULT '/practice-areas' NOT NULL,
	"stat_years_experience" integer DEFAULT 20 NOT NULL,
	"stat_lawyers_count" integer DEFAULT 15 NOT NULL,
	"stat_practice_areas_count" integer DEFAULT 10 NOT NULL,
	"stat_clients_served" integer DEFAULT 500 NOT NULL,
	"site_title" varchar(255) DEFAULT 'Harcourt & Vale LLP' NOT NULL,
	"site_description" text,
	"default_seo_image_url" text,
	"google_verification" varchar(255),
	"google_analytics_id" varchar(100),
	"footer_description" text,
	"copyright_text" varchar(255),
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "testimonials" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"client_name" varchar(200) NOT NULL,
	"is_anonymous" boolean DEFAULT false NOT NULL,
	"testimonial" text NOT NULL,
	"company_position" varchar(255),
	"image_url" text,
	"date_given" timestamp,
	"published" boolean DEFAULT false NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'EDITOR' NOT NULL,
	"avatar_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "why_choose_us_items" (
	"id" varchar(128) PRIMARY KEY NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"icon_name" varchar(100) DEFAULT 'shield-check' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_blog_post_id_blog_posts_id_fk" FOREIGN KEY ("blog_post_id") REFERENCES "public"."blog_posts"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_tag_id_blog_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."blog_tags"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_category_id_blog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."blog_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "faqs" ADD CONSTRAINT "faqs_practice_area_id_practice_areas_id_fk" FOREIGN KEY ("practice_area_id") REFERENCES "public"."practice_areas"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lawyer_practice_areas" ADD CONSTRAINT "lawyer_practice_areas_lawyer_id_lawyers_id_fk" FOREIGN KEY ("lawyer_id") REFERENCES "public"."lawyers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "lawyer_practice_areas" ADD CONSTRAINT "lawyer_practice_areas_practice_area_id_practice_areas_id_fk" FOREIGN KEY ("practice_area_id") REFERENCES "public"."practice_areas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "media" ADD CONSTRAINT "media_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "practice_area_services" ADD CONSTRAINT "practice_area_services_practice_area_id_practice_areas_id_fk" FOREIGN KEY ("practice_area_id") REFERENCES "public"."practice_areas"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
