// ============================================================================
// Law Firm CMS — Database Schema (Drizzle ORM / PostgreSQL)
//
// Normalized relational design. Anything a non-technical admin should be
// able to change lives in a table here — not hard-coded in components.
// A few genuinely 1:1 "page copy" fields (About page prose, site settings)
// live as columns on a singleton row rather than their own table, since
// they aren't repeatable/listable records.
// ============================================================================

import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  primaryKey,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

const id = () => varchar("id", { length: 128 }).primaryKey().$defaultFn(() => createId());

// ----------------------------------------------------------------------------
// Enums
// ----------------------------------------------------------------------------

export const roleEnum = pgEnum("role", ["SUPER_ADMIN", "EDITOR"]);
export const contentStatusEnum = pgEnum("content_status", ["DRAFT", "PUBLISHED"]);
export const enquiryTypeEnum = pgEnum("enquiry_type", ["CONTACT", "CONSULTATION"]);
export const enquiryStatusEnum = pgEnum("enquiry_status", [
  "NEW",
  "CONTACTED",
  "IN_PROGRESS",
  "RESOLVED",
  "ARCHIVED",
]);
export const internshipStatusEnum = pgEnum("internship_status", [
  "NEW",
  "REVIEWED",
  "SHORTLISTED",
  "REJECTED",
  "ACCEPTED",
]);

// ----------------------------------------------------------------------------
// Admin Users
// ----------------------------------------------------------------------------

export const users = pgTable("users", {
  id: id(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("EDITOR"),
  avatarUrl: text("avatar_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

// ----------------------------------------------------------------------------
// Lawyers / Team
// ----------------------------------------------------------------------------

export const lawyers = pgTable("lawyers", {
  id: id(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull().unique(),
  position: varchar("position", { length: 200 }).notNull(),
  photoUrl: text("photo_url"),
  bioShort: text("bio_short"),
  bio: text("bio"),
  education: text("education"),
  qualifications: text("qualifications"),
  experienceYears: integer("experience_years"),
  memberships: text("memberships"),
  awards: text("awards"),
  certifications: text("certifications"),
  languages: varchar("languages", { length: 300 }),
  linkedinUrl: text("linkedin_url"),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  published: boolean("published").notNull().default(false),
  featuredHome: boolean("featured_home").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

// ----------------------------------------------------------------------------
// Practice Areas
// ----------------------------------------------------------------------------

export const practiceAreas = pgTable("practice_areas", {
  id: id(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 220 }).notNull().unique(),
  shortDescription: text("short_description").notNull(),
  fullDescription: text("full_description"),
  imageUrl: text("image_url"),
  iconName: varchar("icon_name", { length: 100 }).default("scale"),
  published: boolean("published").notNull().default(false),
  displayOrder: integer("display_order").notNull().default(0),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: text("seo_description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const practiceAreaServices = pgTable("practice_area_services", {
  id: id(),
  practiceAreaId: varchar("practice_area_id", { length: 128 })
    .notNull()
    .references(() => practiceAreas.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const lawyerPracticeAreas = pgTable(
  "lawyer_practice_areas",
  {
    lawyerId: varchar("lawyer_id", { length: 128 })
      .notNull()
      .references(() => lawyers.id, { onDelete: "cascade" }),
    practiceAreaId: varchar("practice_area_id", { length: 128 })
      .notNull()
      .references(() => practiceAreas.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.lawyerId, t.practiceAreaId] }) })
);

// ----------------------------------------------------------------------------
// Blog / Legal Insights
// ----------------------------------------------------------------------------

export const blogCategories = pgTable("blog_categories", {
  id: id(),
  name: varchar("name", { length: 150 }).notNull().unique(),
  slug: varchar("slug", { length: 170 }).notNull().unique(),
});

export const blogTags = pgTable("blog_tags", {
  id: id(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
});

export const blogPosts = pgTable("blog_posts", {
  id: id(),
  title: varchar("title", { length: 300 }).notNull(),
  slug: varchar("slug", { length: 320 }).notNull().unique(),
  excerpt: text("excerpt"),
  content: text("content").notNull(),
  featuredImageUrl: text("featured_image_url"),
  authorId: varchar("author_id", { length: 128 })
    .notNull()
    .references(() => users.id),
  authorName: varchar("author_name", { length: 150 }),
  categoryId: varchar("category_id", { length: 128 }).references(() => blogCategories.id),
  status: contentStatusEnum("status").notNull().default("DRAFT"),
  publishedAt: timestamp("published_at"),
  seoTitle: varchar("seo_title", { length: 255 }),
  seoDescription: text("seo_description"),
  canonicalUrl: text("canonical_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const blogPostTags = pgTable(
  "blog_post_tags",
  {
    blogPostId: varchar("blog_post_id", { length: 128 })
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    tagId: varchar("tag_id", { length: 128 })
      .notNull()
      .references(() => blogTags.id, { onDelete: "cascade" }),
  },
  (t) => ({ pk: primaryKey({ columns: [t.blogPostId, t.tagId] }) })
);

// ----------------------------------------------------------------------------
// FAQs
// ----------------------------------------------------------------------------

export const faqs = pgTable("faqs", {
  id: id(),
  question: varchar("question", { length: 500 }).notNull(),
  answer: text("answer").notNull(),
  category: varchar("category", { length: 150 }),
  practiceAreaId: varchar("practice_area_id", { length: 128 }).references(() => practiceAreas.id, {
    onDelete: "set null",
  }),
  displayOrder: integer("display_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

// ----------------------------------------------------------------------------
// Testimonials
// ----------------------------------------------------------------------------

export const testimonials = pgTable("testimonials", {
  id: id(),
  clientName: varchar("client_name", { length: 200 }).notNull(),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  testimonial: text("testimonial").notNull(),
  companyPosition: varchar("company_position", { length: 255 }),
  imageUrl: text("image_url"),
  dateGiven: timestamp("date_given"),
  published: boolean("published").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

// ----------------------------------------------------------------------------
// Enquiries
// ----------------------------------------------------------------------------

export const enquiries = pgTable("enquiries", {
  id: id(),
  type: enquiryTypeEnum("type").notNull(),
  fullName: varchar("full_name", { length: 200 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  subject: varchar("subject", { length: 300 }),
  areaOfLaw: varchar("area_of_law", { length: 200 }),
  message: text("message").notNull(),
  preferredContactMethod: varchar("preferred_contact_method", { length: 50 }),
  preferredDate: timestamp("preferred_date"),
  preferredTime: varchar("preferred_time", { length: 50 }),
  status: enquiryStatusEnum("status").notNull().default("NEW"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

// ----------------------------------------------------------------------------
// Internship Applications
// ----------------------------------------------------------------------------

export const internshipApplications = pgTable("internship_applications", {
  id: id(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull(),
  // CV + Cover Letter (up to 2 documents) uploaded through the public form.
  files: jsonb("files")
    .$type<{ name: string; url: string; mimeType: string; size: number }[]>()
    .notNull(),
  status: internshipStatusEnum("status").notNull().default("NEW"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

// ----------------------------------------------------------------------------
// Media Library
// ----------------------------------------------------------------------------

export const media = pgTable("media", {
  id: id(),
  filename: varchar("filename", { length: 500 }).notNull(),
  url: text("url").notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  alt: varchar("alt", { length: 255 }),
  uploadedById: varchar("uploaded_by_id", { length: 128 }).references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// Site Settings (singleton)
// ----------------------------------------------------------------------------

export const siteSettings = pgTable("site_settings", {
  id: varchar("id", { length: 20 }).primaryKey().default("singleton"),

  firmName: varchar("firm_name", { length: 255 }).notNull().default("A. Oluogidan & Co"),
  logoUrl: text("logo_url"),
  tagline: varchar("tagline", { length: 255 }),
  description: text("description"),

  email: varchar("email", { length: 255 }).notNull().default("info@example.com"),
  phone: varchar("phone", { length: 50 }).notNull().default("+1 (555) 000-0000"),
  whatsapp: varchar("whatsapp", { length: 50 }),
  address: text("address"),
  workingHours: text("working_hours"),

  socialLinkedin: text("social_linkedin"),
  socialFacebook: text("social_facebook"),
  socialInstagram: text("social_instagram"),
  socialX: text("social_x"),
  socialYoutube: text("social_youtube"),

  heroHeading: varchar("hero_heading", { length: 300 })
    .notNull()
    .default("Strategic Legal Counsel. Trusted Representation."),
  heroSubheading: text("hero_subheading"),
  // Up to 4 photos shown in the hero collage on the homepage. All optional —
  // the hero still renders fine with just the heading/CTA if none are set.
  heroImageUrl: text("hero_image_url"),
  heroImageUrl2: text("hero_image_url_2"),
  heroImageUrl3: text("hero_image_url_3"),
  heroImageUrl4: text("hero_image_url_4"),
  heroCtaText: varchar("hero_cta_text", { length: 100 }).notNull().default("Book a Consultation"),
  heroCtaLink: varchar("hero_cta_link", { length: 255 }).notNull().default("/consultation"),
  heroSecondaryCtaText: varchar("hero_secondary_cta_text", { length: 100 })
    .notNull()
    .default("Explore Our Practice Areas"),
  heroSecondaryCtaLink: varchar("hero_secondary_cta_link", { length: 255 })
    .notNull()
    .default("/practice-areas"),

  statYearsExperience: integer("stat_years_experience").notNull().default(20),
  statLawyersCount: integer("stat_lawyers_count").notNull().default(15),
  statPracticeAreasCount: integer("stat_practice_areas_count").notNull().default(10),
  statClientsServed: integer("stat_clients_served").notNull().default(500),

  // Optional "Trusted By" client logo strip shown on the homepage, right
  // below the stats bar. All six slots are optional — the section on the
  // frontend simply doesn't render until at least one of these is set.
  clientLogoUrl1: text("client_logo_url_1"),
  clientLogoUrl2: text("client_logo_url_2"),
  clientLogoUrl3: text("client_logo_url_3"),
  clientLogoUrl4: text("client_logo_url_4"),
  clientLogoUrl5: text("client_logo_url_5"),
  clientLogoUrl6: text("client_logo_url_6"),

  siteTitle: varchar("site_title", { length: 255 }).notNull().default("A. Oluogidan & Co"),
  siteDescription: text("site_description"),
  defaultSeoImageUrl: text("default_seo_image_url"),
  googleVerification: varchar("google_verification", { length: 255 }),
  googleAnalyticsId: varchar("google_analytics_id", { length: 100 }),

  footerDescription: text("footer_description"),
  copyrightText: varchar("copyright_text", { length: 255 }),

  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

// ----------------------------------------------------------------------------
// About Page content (singleton) + repeatable sub-lists
// ----------------------------------------------------------------------------

export const aboutContent = pgTable("about_content", {
  id: varchar("id", { length: 20 }).primaryKey().default("singleton"),
  introHeading: varchar("intro_heading", { length: 255 }).notNull().default("About Our Firm"),
  introText: text("intro_text"),
  historyText: text("history_text"),
  missionText: text("mission_text"),
  visionText: text("vision_text"),
  approachText: text("approach_text"),
  whyClientsText: text("why_clients_text"),
  ctaText: varchar("cta_text", { length: 100 }).notNull().default("Speak With Our Team"),
  ctaLink: varchar("cta_link", { length: 255 }).notNull().default("/consultation"),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

export const coreValues = pgTable("core_values", {
  id: id(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
});

export const whyChooseUsItems = pgTable("why_choose_us_items", {
  id: id(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  iconName: varchar("icon_name", { length: 100 }).notNull().default("shield-check"),
  displayOrder: integer("display_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
});

// Flat static/legal pages (Disclaimer, Privacy Policy, Terms)
export const pages = pgTable("pages", {
  id: id(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

// Hero banner photo for each of the interior pages that don't already have
// their own content table (Team, Contact, Practice Areas, Insights, FAQ,
// Consultation) plus About. Keyed by a fixed page key rather than an
// auto-generated id, so the admin UI can always show one row per page even
// before an image has ever been set. The homepage keeps its own 4-photo
// slideshow on `site_settings` and isn't part of this table.
export const pageHeroImages = pgTable("page_hero_images", {
  pageKey: varchar("page_key", { length: 50 }).primaryKey(),
  imageUrl: text("image_url"),
  updatedAt: timestamp("updated_at").notNull().defaultNow().$onUpdate(() => new Date()),
});

// ----------------------------------------------------------------------------
// Audit Log
// ----------------------------------------------------------------------------

export const auditLogs = pgTable("audit_logs", {
  id: id(),
  userId: varchar("user_id", { length: 128 }).references(() => users.id, { onDelete: "set null" }),
  userName: varchar("user_name", { length: 200 }).notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 100 }).notNull(),
  resourceId: varchar("resource_id", { length: 128 }),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ----------------------------------------------------------------------------
// Relations (for Drizzle's relational query API)
// ----------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  blogPosts: many(blogPosts),
  media: many(media),
  auditLogs: many(auditLogs),
}));

export const lawyersRelations = relations(lawyers, ({ many }) => ({
  practiceAreas: many(lawyerPracticeAreas),
}));

export const practiceAreasRelations = relations(practiceAreas, ({ many }) => ({
  services: many(practiceAreaServices),
  lawyers: many(lawyerPracticeAreas),
  faqs: many(faqs),
}));

export const practiceAreaServicesRelations = relations(practiceAreaServices, ({ one }) => ({
  practiceArea: one(practiceAreas, {
    fields: [practiceAreaServices.practiceAreaId],
    references: [practiceAreas.id],
  }),
}));

export const lawyerPracticeAreasRelations = relations(lawyerPracticeAreas, ({ one }) => ({
  lawyer: one(lawyers, { fields: [lawyerPracticeAreas.lawyerId], references: [lawyers.id] }),
  practiceArea: one(practiceAreas, {
    fields: [lawyerPracticeAreas.practiceAreaId],
    references: [practiceAreas.id],
  }),
}));

export const blogPostsRelations = relations(blogPosts, ({ one, many }) => ({
  author: one(users, { fields: [blogPosts.authorId], references: [users.id] }),
  category: one(blogCategories, { fields: [blogPosts.categoryId], references: [blogCategories.id] }),
  tags: many(blogPostTags),
}));

export const blogCategoriesRelations = relations(blogCategories, ({ many }) => ({
  posts: many(blogPosts),
}));

export const blogTagsRelations = relations(blogTags, ({ many }) => ({
  posts: many(blogPostTags),
}));

export const blogPostTagsRelations = relations(blogPostTags, ({ one }) => ({
  post: one(blogPosts, { fields: [blogPostTags.blogPostId], references: [blogPosts.id] }),
  tag: one(blogTags, { fields: [blogPostTags.tagId], references: [blogTags.id] }),
}));

export const faqsRelations = relations(faqs, ({ one }) => ({
  practiceArea: one(practiceAreas, { fields: [faqs.practiceAreaId], references: [practiceAreas.id] }),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  uploadedBy: one(users, { fields: [media.uploadedById], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Lawyer = typeof lawyers.$inferSelect;
export type NewLawyer = typeof lawyers.$inferInsert;
export type PracticeArea = typeof practiceAreas.$inferSelect;
export type NewPracticeArea = typeof practiceAreas.$inferInsert;
export type PracticeAreaService = typeof practiceAreaServices.$inferSelect;
export type BlogPost = typeof blogPosts.$inferSelect;
export type NewBlogPost = typeof blogPosts.$inferInsert;
export type BlogCategory = typeof blogCategories.$inferSelect;
export type BlogTag = typeof blogTags.$inferSelect;
export type Faq = typeof faqs.$inferSelect;
export type NewFaq = typeof faqs.$inferInsert;
export type Testimonial = typeof testimonials.$inferSelect;
export type NewTestimonial = typeof testimonials.$inferInsert;
export type Enquiry = typeof enquiries.$inferSelect;
export type NewEnquiry = typeof enquiries.$inferInsert;
export type InternshipApplication = typeof internshipApplications.$inferSelect;
export type NewInternshipApplication = typeof internshipApplications.$inferInsert;
export type Media = typeof media.$inferSelect;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type AboutContent = typeof aboutContent.$inferSelect;
export type CoreValue = typeof coreValues.$inferSelect;
export type WhyChooseUsItem = typeof whyChooseUsItems.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type PageHeroImage = typeof pageHeroImages.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
