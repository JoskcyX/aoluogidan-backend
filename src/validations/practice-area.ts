import { z } from "zod";

export const practiceAreaSchema = z.object({
  name: z.string().trim().min(2, "Enter a practice area name.").max(200),
  shortDescription: z.string().trim().min(10, "Add a short description (at least 10 characters).").max(500),
  fullDescription: z.string().trim().optional().nullable(),
  imageUrl: z.string().trim().optional().nullable(),
  iconName: z.string().trim().max(100).optional().nullable(),
  published: z.boolean().default(false),
  seoTitle: z.string().trim().max(255).optional().nullable(),
  seoDescription: z.string().trim().max(500).optional().nullable(),
  services: z.array(z.string().trim().min(1)).default([]),
  lawyerIds: z.array(z.string()).default([]),
});

export type PracticeAreaFormValues = z.infer<typeof practiceAreaSchema>;
