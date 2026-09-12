import { z } from "zod";
import { sanitizeRichText } from "@/sanitize";

export const blogPostSchema = z.object({
  title: z.string().trim().min(3, "Give the article a title.").max(300),
  authorName: z.string().trim().max(150).optional().nullable(),
  excerpt: z.string().trim().max(500, "Keep the excerpt under 500 characters.").optional().nullable(),
  content: z
    .string()
    .trim()
    .min(20, "Write some article content before publishing.")
    .transform((html) => sanitizeRichText(html)),
  featuredImageUrl: z.string().trim().optional().nullable(),
  categoryId: z.string().trim().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
  seoTitle: z.string().trim().max(255).optional().nullable(),
  seoDescription: z.string().trim().max(500).optional().nullable(),
  canonicalUrl: z.string().trim().url("Enter a valid URL.").optional().or(z.literal("")).nullable(),
  tagNames: z.array(z.string().trim().min(1)).default([]),
});

export type BlogPostFormValues = z.infer<typeof blogPostSchema>;

export const blogCategorySchema = z.object({
  name: z.string().trim().min(2).max(150),
});
