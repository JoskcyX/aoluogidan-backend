import { Router } from "express";
import { and, asc, desc, eq, inArray, ne, or, ilike } from "drizzle-orm";
import { db } from "@/db";
import {
  siteSettings,
  practiceAreas,
  practiceAreaServices,
  lawyers,
  lawyerPracticeAreas,
  faqs,
  blogPosts,
  blogCategories,
  blogTags,
  blogPostTags,
  users,
  testimonials,
  aboutContent,
  coreValues,
  pages,
  enquiries,
} from "@/db/schema";
import { contactFormSchema, consultationFormSchema } from "@/validations/misc";
import { rateLimit, getClientIp } from "@/rate-limit";
import { sendEnquiryNotification } from "@/mailer";

const router = Router();

router.get("/settings", async (_req, res) => {
  const [settings] = await db.select().from(siteSettings).limit(1);
  res.json({ settings });
});

router.get("/practice-areas", async (_req, res) => {
  const rows = await db
    .select()
    .from(practiceAreas)
    .where(eq(practiceAreas.published, true))
    .orderBy(asc(practiceAreas.displayOrder));
  res.json({ practiceAreas: rows });
});

router.get("/practice-areas/:slug", async (req, res) => {
  const [area] = await db
    .select()
    .from(practiceAreas)
    .where(and(eq(practiceAreas.slug, req.params.slug), eq(practiceAreas.published, true)))
    .limit(1);
  if (!area) return res.status(404).json({ error: "Practice area not found." });

  const services = await db
    .select()
    .from(practiceAreaServices)
    .where(eq(practiceAreaServices.practiceAreaId, area.id))
    .orderBy(asc(practiceAreaServices.displayOrder));

  const relatedLawyerLinks = await db
    .select({ lawyerId: lawyerPracticeAreas.lawyerId })
    .from(lawyerPracticeAreas)
    .where(eq(lawyerPracticeAreas.practiceAreaId, area.id));

  const relatedLawyers = relatedLawyerLinks.length
    ? await db
        .select()
        .from(lawyers)
        .where(
          and(
            inArray(
              lawyers.id,
              relatedLawyerLinks.map((l) => l.lawyerId)
            ),
            eq(lawyers.published, true)
          )
        )
    : [];

  const relatedFaqs = await db
    .select()
    .from(faqs)
    .where(and(eq(faqs.practiceAreaId, area.id), eq(faqs.published, true)))
    .orderBy(asc(faqs.displayOrder));

  res.json({ area, services, relatedLawyers, relatedFaqs });
});

router.get("/lawyers", async (req, res) => {
  const featuredHome = req.query.featuredHome === "true";
  const rows = await db
    .select()
    .from(lawyers)
    .where(
      featuredHome
        ? and(eq(lawyers.published, true), eq(lawyers.featuredHome, true))
        : eq(lawyers.published, true)
    )
    .orderBy(asc(lawyers.displayOrder));
  res.json({ lawyers: rows });
});

router.get("/lawyers/:slug", async (req, res) => {
  const [lawyer] = await db
    .select()
    .from(lawyers)
    .where(and(eq(lawyers.slug, req.params.slug), eq(lawyers.published, true)))
    .limit(1);
  if (!lawyer) return res.status(404).json({ error: "Lawyer not found." });

  const links = await db
    .select({ practiceAreaId: lawyerPracticeAreas.practiceAreaId })
    .from(lawyerPracticeAreas)
    .where(eq(lawyerPracticeAreas.lawyerId, lawyer.id));

  const areas = links.length
    ? await db
        .select()
        .from(practiceAreas)
        .where(
          inArray(
            practiceAreas.id,
            links.map((l) => l.practiceAreaId)
          )
        )
    : [];

  res.json({ lawyer, practiceAreas: areas });
});

router.get("/blog-categories", async (_req, res) => {
  const rows = await db.select().from(blogCategories);
  res.json({ categories: rows });
});

router.get("/blog", async (req, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 9)));
  const categorySlug = typeof req.query.category === "string" ? req.query.category : undefined;

  let categoryId: string | undefined;
  if (categorySlug) {
    const [cat] = await db.select().from(blogCategories).where(eq(blogCategories.slug, categorySlug)).limit(1);
    categoryId = cat?.id;
  }

  const where = categoryId
    ? and(eq(blogPosts.status, "PUBLISHED"), eq(blogPosts.categoryId, categoryId))
    : eq(blogPosts.status, "PUBLISHED");

  const posts = await db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      excerpt: blogPosts.excerpt,
      featuredImageUrl: blogPosts.featuredImageUrl,
      publishedAt: blogPosts.publishedAt,
      authorName: users.name,
      categoryName: blogCategories.name,
    })
    .from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(where)
    .orderBy(desc(blogPosts.publishedAt))
    .limit(limit)
    .offset((page - 1) * limit);

  res.json({ posts });
});

router.get("/blog/:slug", async (req, res) => {
  const [post] = await db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      content: blogPosts.content,
      featuredImageUrl: blogPosts.featuredImageUrl,
      publishedAt: blogPosts.publishedAt,
      authorName: users.name,
      categoryName: blogCategories.name,
      categoryId: blogPosts.categoryId,
      seoTitle: blogPosts.seoTitle,
      seoDescription: blogPosts.seoDescription,
    })
    .from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(and(eq(blogPosts.slug, req.params.slug), eq(blogPosts.status, "PUBLISHED")))
    .limit(1);

  if (!post) return res.status(404).json({ error: "Article not found." });

  const tagRows = await db
    .select({ name: blogTags.name })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
    .where(eq(blogPostTags.blogPostId, post.id));

  const related = post.categoryId
    ? await db
        .select({ title: blogPosts.title, slug: blogPosts.slug })
        .from(blogPosts)
        .where(
          and(
            eq(blogPosts.categoryId, post.categoryId),
            eq(blogPosts.status, "PUBLISHED"),
            ne(blogPosts.id, post.id)
          )
        )
        .orderBy(desc(blogPosts.publishedAt))
        .limit(3)
    : [];

  res.json({ post, tags: tagRows.map((t) => t.name), related });
});

router.get("/faqs", async (_req, res) => {
  const rows = await db.select().from(faqs).where(eq(faqs.published, true)).orderBy(asc(faqs.displayOrder));
  res.json({ faqs: rows });
});

router.get("/testimonials", async (req, res) => {
  const featured = req.query.featured === "true";
  const rows = await db
    .select()
    .from(testimonials)
    .where(
      featured
        ? and(eq(testimonials.published, true), eq(testimonials.featured, true))
        : eq(testimonials.published, true)
    );
  res.json({ testimonials: rows });
});

router.get("/about", async (_req, res) => {
  const [about] = await db.select().from(aboutContent).limit(1);
  const values = await db
    .select()
    .from(coreValues)
    .where(eq(coreValues.published, true))
    .orderBy(asc(coreValues.displayOrder));
  res.json({ about, values });
});

router.get("/pages/:slug", async (req, res) => {
  const [page] = await db.select().from(pages).where(eq(pages.slug, req.params.slug)).limit(1);
  if (!page) return res.status(404).json({ error: "Page not found." });
  res.json({ page });
});

router.get("/sitemap-data", async (_req, res) => {
  const areas = await db
    .select({ slug: practiceAreas.slug, updatedAt: practiceAreas.updatedAt })
    .from(practiceAreas)
    .where(eq(practiceAreas.published, true));
  const team = await db
    .select({ slug: lawyers.slug, updatedAt: lawyers.updatedAt })
    .from(lawyers)
    .where(eq(lawyers.published, true));
  const posts = await db
    .select({ slug: blogPosts.slug, updatedAt: blogPosts.updatedAt })
    .from(blogPosts)
    .where(eq(blogPosts.status, "PUBLISHED"));
  res.json({ areas, team, posts });
});

/* --------------------------------------------------------------------- */
/*  Contact / consultation form submissions                              */
/* --------------------------------------------------------------------- */

router.post("/contact", async (req, res) => {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`contact:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!allowed) {
    return res
      .status(429)
      .json({ error: "You've submitted several requests recently. Please try again in a little while." });
  }

  const parsed = contactFormSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid submission." });
  }

  if (parsed.data.website) {
    // Honeypot tripped — pretend success so the bot doesn't retry.
    return res.json({ ok: true });
  }

  const { fullName, email, phone, subject, areaOfLaw, message } = parsed.data;

  await db.insert(enquiries).values({
    type: "CONTACT",
    fullName,
    email,
    phone: phone || null,
    subject: subject || null,
    areaOfLaw: areaOfLaw || null,
    message,
    status: "NEW",
  });

  await sendEnquiryNotification({ type: "Contact", fullName, email, phone, subject, areaOfLaw, message });

  res.json({ ok: true });
});

router.post("/consultation", async (req, res) => {
  const ip = getClientIp(req);
  const { allowed } = rateLimit(`consultation:${ip}`, { limit: 5, windowMs: 15 * 60 * 1000 });
  if (!allowed) {
    return res
      .status(429)
      .json({ error: "You've submitted several requests recently. Please try again in a little while." });
  }

  const parsed = consultationFormSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid submission." });
  }

  if (parsed.data.website) {
    return res.json({ ok: true });
  }

  const { fullName, email, phone, preferredContactMethod, areaOfLaw, preferredDate, preferredTime, message } =
    parsed.data;

  await db.insert(enquiries).values({
    type: "CONSULTATION",
    fullName,
    email,
    phone: phone || null,
    areaOfLaw: areaOfLaw || null,
    preferredContactMethod: preferredContactMethod || null,
    preferredDate: preferredDate ? new Date(preferredDate) : null,
    preferredTime: preferredTime || null,
    message,
    status: "NEW",
  });

  await sendEnquiryNotification({ type: "Consultation", fullName, email, phone, areaOfLaw, message });

  res.json({ ok: true });
});

export default router;
