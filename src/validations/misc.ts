import { z } from "zod";
import { sanitizeRichText } from "@/sanitize";

export const faqSchema = z.object({
  question: z.string().trim().min(5, "Enter the question.").max(500),
  answer: z.string().trim().min(5, "Enter the answer.").max(5000),
  category: z.string().trim().max(150).optional().nullable(),
  practiceAreaId: z.string().trim().optional().nullable(),
  published: z.boolean().default(true),
});
export type FaqFormValues = z.infer<typeof faqSchema>;

export const testimonialSchema = z.object({
  clientName: z.string().trim().min(2, "Enter the client's name or an anonymous label.").max(200),
  isAnonymous: z.boolean().default(false),
  testimonial: z.string().trim().min(10, "Enter the testimonial text.").max(2000),
  companyPosition: z.string().trim().max(255).optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  dateGiven: z.string().trim().optional().nullable(),
  published: z.boolean().default(false),
  featured: z.boolean().default(false),
});
export type TestimonialFormValues = z.infer<typeof testimonialSchema>;

export const enquiryStatusSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "IN_PROGRESS", "RESOLVED", "ARCHIVED"]),
});

const emailField = z.string().trim().email("Enter a valid email address.");
const nameField = z.string().trim().min(2, "Enter your full name.").max(200);
const messageField = z.string().trim().min(10, "Please add a short message.").max(3000);

export const contactFormSchema = z.object({
  fullName: nameField,
  email: emailField,
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  subject: z.string().trim().max(300).optional().or(z.literal("")),
  areaOfLaw: z.string().trim().max(200).optional().or(z.literal("")),
  message: messageField,
  // Honeypot field: real users never fill this in. Bots that fill every
  // field on a scraped form will, and we silently drop those submissions.
  website: z.string().max(0).optional().or(z.literal("")),
});
export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const consultationFormSchema = z.object({
  fullName: nameField,
  email: emailField,
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  preferredContactMethod: z.enum(["Email", "Phone", "WhatsApp"]).optional(),
  areaOfLaw: z.string().trim().max(200).optional().or(z.literal("")),
  preferredDate: z.string().trim().optional().or(z.literal("")),
  preferredTime: z.string().trim().max(50).optional().or(z.literal("")),
  message: messageField,
  website: z.string().max(0).optional().or(z.literal("")),
});
export type ConsultationFormValues = z.infer<typeof consultationFormSchema>;

export const internshipApplicationSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name.").max(100),
  lastName: z.string().trim().min(1, "Enter your last name.").max(100),
  email: emailField,
  phone: z.string().trim().min(5, "Enter a phone number.").max(50),
  website: z.string().max(0).optional().or(z.literal("")),
});
export type InternshipApplicationFormValues = z.infer<typeof internshipApplicationSchema>;

export const internshipStatusSchema = z.object({
  status: z.enum(["NEW", "REVIEWED", "SHORTLISTED", "REJECTED", "ACCEPTED"]),
});

export const settingsSchema = z.object({
  firmName: z.string().trim().min(2).max(255),
  logoUrl: z.string().trim().optional().nullable(),
  tagline: z.string().trim().max(255).optional().nullable(),
  description: z.string().trim().optional().nullable(),
  email: emailField,
  phone: z.string().trim().min(5).max(50),
  whatsapp: z.string().trim().max(50).optional().nullable(),
  address: z.string().trim().optional().nullable(),
  workingHours: z.string().trim().optional().nullable(),
  socialLinkedin: z.string().trim().optional().nullable(),
  socialFacebook: z.string().trim().optional().nullable(),
  socialInstagram: z.string().trim().optional().nullable(),
  socialX: z.string().trim().optional().nullable(),
  socialYoutube: z.string().trim().optional().nullable(),
  heroHeading: z.string().trim().min(4).max(300),
  heroSubheading: z.string().trim().optional().nullable(),
  heroImageUrl: z.string().trim().optional().nullable(),
  heroImageUrl2: z.string().trim().optional().nullable(),
  heroImageUrl3: z.string().trim().optional().nullable(),
  heroImageUrl4: z.string().trim().optional().nullable(),
  heroCtaText: z.string().trim().min(2).max(100),
  heroCtaLink: z.string().trim().min(1).max(255),
  heroSecondaryCtaText: z.string().trim().min(2).max(100),
  heroSecondaryCtaLink: z.string().trim().min(1).max(255),
  statYearsExperience: z.coerce.number().int().min(0).max(200),
  statLawyersCount: z.coerce.number().int().min(0).max(10000),
  statPracticeAreasCount: z.coerce.number().int().min(0).max(1000),
  statClientsServed: z.coerce.number().int().min(0).max(1000000),
  siteTitle: z.string().trim().min(2).max(255),
  siteDescription: z.string().trim().optional().nullable(),
  defaultSeoImageUrl: z.string().trim().optional().nullable(),
  googleVerification: z.string().trim().max(255).optional().nullable(),
  googleAnalyticsId: z.string().trim().max(100).optional().nullable(),
  footerDescription: z.string().trim().optional().nullable(),
  copyrightText: z.string().trim().max(255).optional().nullable(),
});
export type SettingsFormValues = z.infer<typeof settingsSchema>;

export const aboutContentSchema = z.object({
  introHeading: z.string().trim().min(2).max(255),
  introText: z.string().trim().optional().nullable(),
  historyText: z.string().trim().optional().nullable(),
  missionText: z.string().trim().optional().nullable(),
  visionText: z.string().trim().optional().nullable(),
  approachText: z.string().trim().optional().nullable(),
  whyClientsText: z.string().trim().optional().nullable(),
  ctaText: z.string().trim().min(2).max(100),
  ctaLink: z.string().trim().min(1).max(255),
  coreValues: z
    .array(z.object({ title: z.string().trim().min(1), description: z.string().trim().min(1) }))
    .default([]),
  whyChooseUsItems: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        description: z.string().trim().min(1),
        iconName: z.string().trim().min(1).default("shield-check"),
      })
    )
    .default([]),
});
export type AboutContentFormValues = z.infer<typeof aboutContentSchema>;

export const userSchema = z.object({
  name: z.string().trim().min(2, "Enter the admin's full name.").max(200),
  email: emailField,
  role: z.enum(["SUPER_ADMIN", "EDITOR"]),
  isActive: z.boolean().default(true),
  password: z
    .string()
    .min(10, "Passwords must be at least 10 characters.")
    .max(200)
    .optional()
    .or(z.literal("")),
});
export type UserFormValues = z.infer<typeof userSchema>;

export const pageContentSchema = z.object({
  title: z.string().trim().min(2).max(255),
  content: z
    .string()
    .trim()
    .min(1)
    .transform((html) => sanitizeRichText(html)),
});

/** The fixed set of interior pages that can have an admin-set hero photo. */
export const PAGE_HERO_KEYS = [
  "about",
  "team",
  "contact",
  "practice-areas",
  "insights",
  "faq",
  "consultation",
] as const;
export type PageHeroKey = (typeof PAGE_HERO_KEYS)[number];

export const pageHeroSchema = z.object({
  imageUrl: z.string().trim().max(2000).optional().nullable(),
});
export type PageHeroFormValues = z.infer<typeof pageHeroSchema>;
