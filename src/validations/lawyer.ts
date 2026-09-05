import { z } from "zod";

export const lawyerSchema = z.object({
  name: z.string().trim().min(2, "Enter the lawyer's full name.").max(200),
  position: z.string().trim().min(2, "Enter a job title, e.g. \"Managing Partner\".").max(200),
  photoUrl: z.string().trim().optional().nullable(),
  bioShort: z.string().trim().max(400, "Keep the short bio under 400 characters.").optional().nullable(),
  bio: z.string().trim().optional().nullable(),
  education: z.string().trim().optional().nullable(),
  qualifications: z.string().trim().optional().nullable(),
  experienceYears: z.coerce.number().int().min(0).max(80).optional().nullable(),
  memberships: z.string().trim().optional().nullable(),
  awards: z.string().trim().optional().nullable(),
  certifications: z.string().trim().optional().nullable(),
  languages: z.string().trim().max(300).optional().nullable(),
  linkedinUrl: z.string().trim().url("Enter a valid LinkedIn URL.").optional().or(z.literal("")).nullable(),
  email: z.string().trim().email("Enter a valid email address.").optional().or(z.literal("")).nullable(),
  phone: z.string().trim().max(50).optional().nullable(),
  published: z.boolean().default(false),
  featuredHome: z.boolean().default(false),
  seoTitle: z.string().trim().max(255).optional().nullable(),
  seoDescription: z.string().trim().max(500).optional().nullable(),
  practiceAreaIds: z.array(z.string()).default([]),
});

export type LawyerFormValues = z.infer<typeof lawyerSchema>;
