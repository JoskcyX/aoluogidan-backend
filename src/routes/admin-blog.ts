import { Router } from "express";
import { and, asc, desc, eq, ilike, ne } from "drizzle-orm";
import { db } from "@/db";
import { blogPosts, blogTags, blogPostTags, blogCategories, faqs, testimonials, users } from "@/db/schema";
import { blogPostSchema, blogCategorySchema } from "@/validations/blog-post";
import { faqSchema, testimonialSchema } from "@/validations/misc";
import { requireAuth } from "@/auth";
import { logAction } from "@/audit";
import { ensureUniqueSlug, toSlug } from "@/slug";
import { sql } from "drizzle-orm";

const router = Router();
router.use(requireAuth);

/* ---------------------------------- Blog ---------------------------------- */

async function resolveTagIds(tagNames: string[]) {
  const ids: string[] = [];
  for (const name of tagNames) {
    const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
    if (!slug) continue;
    const [existing] = await db.select().from(blogTags).where(eq(blogTags.slug, slug)).limit(1);
    if (existing) {
      ids.push(existing.id);
    } else {
      const [created] = await db.insert(blogTags).values({ name: name.trim(), slug }).returning();
      ids.push(created.id);
    }
  }
  return ids;
}

router.get("/blog", async (req, res) => {
  const search = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
  const rows = await db
    .select({
      id: blogPosts.id,
      title: blogPosts.title,
      slug: blogPosts.slug,
      status: blogPosts.status,
      publishedAt: blogPosts.publishedAt,
      createdAt: blogPosts.createdAt,
      categoryId: blogPosts.categoryId,
      authorName: sql<string>`coalesce(${blogPosts.authorName}, ${users.name})`,
      categoryName: blogCategories.name,
    })
    .from(blogPosts)
    .leftJoin(users, eq(blogPosts.authorId, users.id))
    .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
    .where(search ? ilike(blogPosts.title, `%${search}%`) : undefined)
    .orderBy(desc(blogPosts.createdAt));
  res.json({ posts: rows });
});

router.get("/blog/:id", async (req, res) => {
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, req.params.id)).limit(1);
  if (!post) return res.status(404).json({ error: "Article not found." });

  const tagRows = await db
    .select({ name: blogTags.name })
    .from(blogPostTags)
    .innerJoin(blogTags, eq(blogPostTags.tagId, blogTags.id))
    .where(eq(blogPostTags.blogPostId, post.id));

  res.json({ post, tagNames: tagRows.map((t) => t.name) });
});

router.post("/blog", async (req, res) => {
  const user = req.user!;
  const parsed = blogPostSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });

  const { tagNames, ...data } = parsed.data;
  const slug = await ensureUniqueSlug(data.title, async (candidate) => {
    const [existing] = await db.select({ id: blogPosts.id }).from(blogPosts).where(eq(blogPosts.slug, candidate)).limit(1);
    return !!existing;
  });

  const [created] = await db
    .insert(blogPosts)
    .values({
      ...data,
      authorName: data.authorName?.trim() || null,
      slug,
      authorId: user.id,
      categoryId: data.categoryId || null,
      publishedAt: data.status === "PUBLISHED" ? new Date() : null,
    })
    .returning();

  const tagIds = await resolveTagIds(tagNames);
  if (tagIds.length > 0) {
    await db.insert(blogPostTags).values(tagIds.map((tagId) => ({ blogPostId: created.id, tagId })));
  }

  await logAction(user, {
    action: data.status === "PUBLISHED" ? "published" : "created",
    resourceType: "Blog Post",
    resourceId: created.id,
    description: `${data.status === "PUBLISHED" ? "published" : "drafted"} the article "${created.title}".`,
  });

  res.status(201).json({ post: created });
});

router.patch("/blog/:id", async (req, res) => {
  const user = req.user!;
  const [existing] = await db.select().from(blogPosts).where(eq(blogPosts.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Article not found." });

  const parsed = blogPostSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });

  const { tagNames, ...data } = parsed.data;

  let slug = existing.slug;
  if (data.title !== existing.title) {
    slug = await ensureUniqueSlug(data.title, async (candidate) => {
      const [taken] = await db
        .select({ id: blogPosts.id })
        .from(blogPosts)
        .where(and(eq(blogPosts.slug, candidate), ne(blogPosts.id, existing.id)))
        .limit(1);
      return !!taken;
    });
  }

  const justPublished = existing.status !== "PUBLISHED" && data.status === "PUBLISHED";

  const [updated] = await db
    .update(blogPosts)
    .set({
      ...data,
      authorName: data.authorName?.trim() || null,
      slug,
      categoryId: data.categoryId || null,
      publishedAt: justPublished ? new Date() : existing.publishedAt,
    })
    .where(eq(blogPosts.id, req.params.id))
    .returning();

  await db.delete(blogPostTags).where(eq(blogPostTags.blogPostId, updated.id));
  const tagIds = await resolveTagIds(tagNames);
  if (tagIds.length > 0) {
    await db.insert(blogPostTags).values(tagIds.map((tagId) => ({ blogPostId: updated.id, tagId })));
  }

  await logAction(user, {
    action: justPublished ? "published" : "updated",
    resourceType: "Blog Post",
    resourceId: updated.id,
    description: `${justPublished ? "published" : "updated"} the article "${updated.title}".`,
  });

  res.json({ post: updated });
});

router.delete("/blog/:id", async (req, res) => {
  const user = req.user!;
  const [existing] = await db.select().from(blogPosts).where(eq(blogPosts.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Article not found." });

  await db.delete(blogPosts).where(eq(blogPosts.id, req.params.id));
  await logAction(user, {
    action: "deleted",
    resourceType: "Blog Post",
    resourceId: req.params.id,
    description: `deleted the article "${existing.title}".`,
  });

  res.json({ ok: true });
});

router.get("/blog-categories", async (_req, res) => {
  const rows = await db.select().from(blogCategories);
  res.json({ categories: rows });
});

router.post("/blog-categories", async (req, res) => {
  const parsed = blogCategorySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Enter a category name." });

  const [created] = await db
    .insert(blogCategories)
    .values({ name: parsed.data.name, slug: toSlug(parsed.data.name) })
    .returning();
  res.status(201).json({ category: created });
});

/* ---------------------------------- FAQs ----------------------------------- */

router.get("/faqs", async (_req, res) => {
  const rows = await db.select().from(faqs).orderBy(asc(faqs.displayOrder));
  res.json({ faqs: rows });
});

router.get("/faqs/:id", async (req, res) => {
  const [faq] = await db.select().from(faqs).where(eq(faqs.id, req.params.id)).limit(1);
  if (!faq) return res.status(404).json({ error: "FAQ not found." });
  res.json({ faq });
});

router.post("/faqs", async (req, res) => {
  const user = req.user!;
  const parsed = faqSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });

  const [{ maxOrder }]: any = await db.execute(sql`select coalesce(max(display_order), 0) as "maxOrder" from faqs`);

  const [created] = await db
    .insert(faqs)
    .values({ ...parsed.data, practiceAreaId: parsed.data.practiceAreaId || null, displayOrder: Number(maxOrder) + 1 })
    .returning();

  await logAction(user, {
    action: "created",
    resourceType: "FAQ",
    resourceId: created.id,
    description: `added the FAQ "${created.question}".`,
  });

  res.status(201).json({ faq: created });
});

router.patch("/faqs/:id", async (req, res) => {
  const user = req.user!;
  const [existing] = await db.select().from(faqs).where(eq(faqs.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "FAQ not found." });

  const body = req.body ?? {};
  if (Object.keys(body).length === 1 && "published" in body) {
    const [updated] = await db
      .update(faqs)
      .set({ published: Boolean(body.published) })
      .where(eq(faqs.id, req.params.id))
      .returning();
    await logAction(user, {
      action: updated.published ? "published" : "unpublished",
      resourceType: "FAQ",
      resourceId: updated.id,
      description: `${updated.published ? "published" : "unpublished"} a FAQ.`,
    });
    return res.json({ faq: updated });
  }

  const parsed = faqSchema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });

  const [updated] = await db
    .update(faqs)
    .set({ ...parsed.data, practiceAreaId: parsed.data.practiceAreaId || null })
    .where(eq(faqs.id, req.params.id))
    .returning();

  await logAction(user, {
    action: "updated",
    resourceType: "FAQ",
    resourceId: updated.id,
    description: `updated the FAQ "${updated.question}".`,
  });

  res.json({ faq: updated });
});

router.delete("/faqs/:id", async (req, res) => {
  const user = req.user!;
  const [existing] = await db.select().from(faqs).where(eq(faqs.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "FAQ not found." });

  await db.delete(faqs).where(eq(faqs.id, req.params.id));
  await logAction(user, {
    action: "deleted",
    resourceType: "FAQ",
    resourceId: req.params.id,
    description: `deleted the FAQ "${existing.question}".`,
  });

  res.json({ ok: true });
});

/* ------------------------------ Testimonials ------------------------------- */

router.get("/testimonials", async (_req, res) => {
  const rows = await db.select().from(testimonials).orderBy(desc(testimonials.createdAt));
  res.json({ testimonials: rows });
});

router.get("/testimonials/:id", async (req, res) => {
  const [row] = await db.select().from(testimonials).where(eq(testimonials.id, req.params.id)).limit(1);
  if (!row) return res.status(404).json({ error: "Testimonial not found." });
  res.json({ testimonial: row });
});

router.post("/testimonials", async (req, res) => {
  const user = req.user!;
  const parsed = testimonialSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });

  const { dateGiven, ...rest } = parsed.data;
  const [created] = await db
    .insert(testimonials)
    .values({ ...rest, dateGiven: dateGiven ? new Date(dateGiven) : null })
    .returning();

  await logAction(user, {
    action: "created",
    resourceType: "Testimonial",
    resourceId: created.id,
    description: `added a testimonial from "${created.clientName}".`,
  });

  res.status(201).json({ testimonial: created });
});

router.patch("/testimonials/:id", async (req, res) => {
  const user = req.user!;
  const [existing] = await db.select().from(testimonials).where(eq(testimonials.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Testimonial not found." });

  const body = req.body ?? {};
  if (Object.keys(body).length === 1 && ("published" in body || "featured" in body)) {
    const [updated] = await db.update(testimonials).set(body).where(eq(testimonials.id, req.params.id)).returning();
    await logAction(user, {
      action: "updated",
      resourceType: "Testimonial",
      resourceId: updated.id,
      description: `updated a testimonial from "${updated.clientName}".`,
    });
    return res.json({ testimonial: updated });
  }

  const parsed = testimonialSchema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });

  const { dateGiven, ...rest } = parsed.data;
  const [updated] = await db
    .update(testimonials)
    .set({ ...rest, dateGiven: dateGiven ? new Date(dateGiven) : null })
    .where(eq(testimonials.id, req.params.id))
    .returning();

  await logAction(user, {
    action: "updated",
    resourceType: "Testimonial",
    resourceId: updated.id,
    description: `updated a testimonial from "${updated.clientName}".`,
  });

  res.json({ testimonial: updated });
});

router.delete("/testimonials/:id", async (req, res) => {
  const user = req.user!;
  const [existing] = await db.select().from(testimonials).where(eq(testimonials.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Testimonial not found." });

  await db.delete(testimonials).where(eq(testimonials.id, req.params.id));
  await logAction(user, {
    action: "deleted",
    resourceType: "Testimonial",
    resourceId: req.params.id,
    description: `deleted a testimonial from "${existing.clientName}".`,
  });

  res.json({ ok: true });
});

export default router;
