import { Router } from "express";
import multer from "multer";
import bcrypt from "bcryptjs";
import { and, count, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  media,
  siteSettings,
  aboutContent,
  coreValues,
  whyChooseUsItems,
  pages,
  pageHeroImages,
  enquiries,
  lawyers,
  practiceAreas,
  blogPosts,
  testimonials,
  auditLogs,
} from "@/db/schema";
import { userSchema, settingsSchema, aboutContentSchema, pageContentSchema, pageHeroSchema, PAGE_HERO_KEYS, enquiryStatusSchema } from "@/validations/misc";
import { requireAuth, requireSuperAdmin } from "@/auth";
import { logAction } from "@/audit";
import { storage, validateUploadedImage, InvalidImageError } from "@/storage";

const router = Router();
router.use(requireAuth);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

/* ---------------------------------- Users ---------------------------------- */

router.get("/users", requireSuperAdmin, async (_req, res) => {
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive, createdAt: users.createdAt })
    .from(users);
  res.json({ users: rows });
});

router.get("/users/:id", requireSuperAdmin, async (req, res) => {
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, req.params.id))
    .limit(1);
  if (!row) return res.status(404).json({ error: "Admin not found." });
  res.json({ user: row });
});

router.post("/users", requireSuperAdmin, async (req, res) => {
  const user = req.user!;
  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });

  if (!parsed.data.password) {
    return res.status(400).json({ error: "A password is required for new admin accounts." });
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, parsed.data.email.toLowerCase()))
    .limit(1);
  if (existing) return res.status(409).json({ error: "An admin with that email already exists." });

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  const [created] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      isActive: parsed.data.isActive,
      passwordHash,
    })
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive });

  await logAction(user, {
    action: "created",
    resourceType: "Admin User",
    resourceId: created.id,
    description: `added the admin account for "${created.name}".`,
  });

  res.status(201).json({ user: created });
});

router.patch("/users/:id", requireSuperAdmin, async (req, res) => {
  const currentUser = req.user!;
  const [existing] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Admin not found." });

  const parsed = userSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });

  if (existing.id === currentUser.id && (parsed.data.role !== "SUPER_ADMIN" || !parsed.data.isActive)) {
    const [{ value: superAdminCount }] = await db
      .select({ value: count() })
      .from(users)
      .where(and(eq(users.role, "SUPER_ADMIN"), eq(users.isActive, true), ne(users.id, existing.id)));
    if (superAdminCount === 0) {
      return res.status(400).json({ error: "You can't remove the last active Super Admin." });
    }
  }

  const emailTaken = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, parsed.data.email.toLowerCase()), ne(users.id, existing.id)))
    .limit(1);
  if (emailTaken.length > 0) return res.status(409).json({ error: "Another admin already uses that email." });

  const passwordHash = parsed.data.password ? await bcrypt.hash(parsed.data.password, 12) : existing.passwordHash;

  const [updated] = await db
    .update(users)
    .set({
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      isActive: parsed.data.isActive,
      passwordHash,
    })
    .where(eq(users.id, req.params.id))
    .returning({ id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive });

  await logAction(currentUser, {
    action: "updated",
    resourceType: "Admin User",
    resourceId: updated.id,
    description: `updated the admin account for "${updated.name}".`,
  });

  res.json({ user: updated });
});

router.delete("/users/:id", requireSuperAdmin, async (req, res) => {
  const currentUser = req.user!;
  if (req.params.id === currentUser.id) {
    return res.status(400).json({ error: "You can't delete your own account." });
  }

  const [existing] = await db.select().from(users).where(eq(users.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Admin not found." });

  await db.delete(users).where(eq(users.id, req.params.id));

  await logAction(currentUser, {
    action: "deleted",
    resourceType: "Admin User",
    resourceId: req.params.id,
    description: `removed the admin account for "${existing.name}".`,
  });

  res.json({ ok: true });
});

/* ---------------------------------- Media ----------------------------------- */

const ALLOWED_FOLDERS = ["lawyers", "blog", "practice-areas", "testimonials", "general"];

router.get("/media", async (_req, res) => {
  const rows = await db.select().from(media).orderBy(desc(media.createdAt));
  res.json({ media: rows });
});

router.post("/upload", upload.single("file"), async (req, res) => {
  const user = req.user!;
  const file = req.file;
  const folderRaw = req.body?.folder;
  const folder = typeof folderRaw === "string" && ALLOWED_FOLDERS.includes(folderRaw) ? folderRaw : "general";

  if (!file) return res.status(400).json({ error: "No file was uploaded." });

  const uploaded = { buffer: file.buffer, originalName: file.originalname, mimeType: file.mimetype, size: file.size };

  const validationError = validateUploadedImage(uploaded);
  if (validationError) return res.status(400).json({ error: validationError });

  let stored;
  try {
    stored = await storage.save(uploaded, folder);
  } catch (err) {
    if (err instanceof InvalidImageError) return res.status(400).json({ error: err.message });
    throw err;
  }

  const [record] = await db
    .insert(media)
    .values({
      filename: stored.filename,
      url: stored.url,
      mimeType: stored.mimeType,
      size: stored.size,
      uploadedById: user.id,
    })
    .returning();

  res.json({ media: record });
});

router.delete("/media/:id", async (req, res) => {
  const user = req.user!;
  const [existing] = await db.select().from(media).where(eq(media.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "File not found." });

  await storage.delete(existing.url);
  await db.delete(media).where(eq(media.id, req.params.id));

  await logAction(user, {
    action: "deleted",
    resourceType: "Media",
    resourceId: req.params.id,
    description: `deleted the file "${existing.filename}".`,
  });

  res.json({ ok: true });
});

/* -------------------------------- Settings ---------------------------------- */

router.get("/settings", async (_req, res) => {
  const [settings] = await db.select().from(siteSettings).limit(1);
  res.json({ settings });
});

router.patch("/settings", async (req, res) => {
  const user = req.user!;
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });

  const [updated] = await db.update(siteSettings).set(parsed.data).where(eq(siteSettings.id, "singleton")).returning();

  await logAction(user, { action: "updated", resourceType: "Settings", description: "updated the site settings." });

  res.json({ settings: updated });
});

/* ---------------------------------- About ------------------------------------ */

router.get("/about", async (_req, res) => {
  const [about] = await db.select().from(aboutContent).limit(1);
  const values = await db.select().from(coreValues).orderBy(coreValues.displayOrder);
  const items = await db.select().from(whyChooseUsItems).orderBy(whyChooseUsItems.displayOrder);
  res.json({ about, coreValues: values, whyChooseUsItems: items });
});

router.patch("/about", async (req, res) => {
  const user = req.user!;
  const parsed = aboutContentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });

  const { coreValues: values, whyChooseUsItems: items, ...rest } = parsed.data;

  const [updated] = await db.update(aboutContent).set(rest).where(eq(aboutContent.id, "singleton")).returning();

  await db.delete(coreValues);
  if (values.length > 0) {
    await db.insert(coreValues).values(values.map((v, i) => ({ ...v, displayOrder: i })));
  }

  await db.delete(whyChooseUsItems);
  if (items.length > 0) {
    await db.insert(whyChooseUsItems).values(items.map((v, i) => ({ ...v, displayOrder: i })));
  }

  await logAction(user, { action: "updated", resourceType: "About Page", description: "updated the About page content." });

  res.json({ aboutContent: updated });
});

/* ---------------------------------- Pages ------------------------------------ */

router.get("/pages", async (_req, res) => {
  const rows = await db.select().from(pages);
  res.json({ pages: rows });
});

router.get("/pages/:slug", async (req, res) => {
  const [page] = await db.select().from(pages).where(eq(pages.slug, req.params.slug)).limit(1);
  if (!page) return res.status(404).json({ error: "Page not found." });
  res.json({ page });
});

router.patch("/pages/:slug", async (req, res) => {
  const user = req.user!;
  const parsed = pageContentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Please fill in both the title and content." });

  const [updated] = await db.update(pages).set(parsed.data).where(eq(pages.slug, req.params.slug)).returning();
  if (!updated) return res.status(404).json({ error: "Page not found." });

  await logAction(user, {
    action: "updated",
    resourceType: "Page",
    resourceId: updated.id,
    description: `updated the "${updated.title}" page.`,
  });

  res.json({ page: updated });
});

/* ----------------------------- Page Hero Images -------------------------------- */
// One banner photo per interior page (About, Team, Contact, Practice Areas,
// Insights, FAQ, Consultation). The homepage's own 4-photo slideshow still
// lives on /settings and is untouched by this.

router.get("/page-heroes", async (_req, res) => {
  const rows = await db.select().from(pageHeroImages);
  const byKey = new Map(rows.map((r) => [r.pageKey, r.imageUrl]));
  const pageHeroes = PAGE_HERO_KEYS.map((key) => ({ pageKey: key, imageUrl: byKey.get(key) ?? null }));
  res.json({ pageHeroes });
});

router.patch("/page-heroes/:key", async (req, res) => {
  const user = req.user!;
  const key = req.params.key;
  if (!PAGE_HERO_KEYS.includes(key as any)) {
    return res.status(400).json({ error: "Unknown page." });
  }

  const parsed = pageHeroSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });

  const [updated] = await db
    .insert(pageHeroImages)
    .values({ pageKey: key, imageUrl: parsed.data.imageUrl ?? null })
    .onConflictDoUpdate({
      target: pageHeroImages.pageKey,
      set: { imageUrl: parsed.data.imageUrl ?? null, updatedAt: new Date() },
    })
    .returning();

  await logAction(user, {
    action: "updated",
    resourceType: "Page Hero Image",
    description: `updated the hero photo for the "${key}" page.`,
  });

  res.json({ pageHero: updated });
});

/* -------------------------------- Enquiries ----------------------------------- */

router.get("/enquiries", async (_req, res) => {
  const rows = await db.select().from(enquiries).orderBy(desc(enquiries.createdAt));
  res.json({ enquiries: rows });
});

router.get("/enquiries/:id", async (req, res) => {
  const [row] = await db.select().from(enquiries).where(eq(enquiries.id, req.params.id)).limit(1);
  if (!row) return res.status(404).json({ error: "Enquiry not found." });
  res.json({ enquiry: row });
});

router.patch("/enquiries/:id", async (req, res) => {
  const user = req.user!;
  const parsed = enquiryStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid status." });

  const [updated] = await db
    .update(enquiries)
    .set({ status: parsed.data.status })
    .where(eq(enquiries.id, req.params.id))
    .returning();
  if (!updated) return res.status(404).json({ error: "Enquiry not found." });

  await logAction(user, {
    action: "updated",
    resourceType: "Enquiry",
    resourceId: updated.id,
    description: `marked the enquiry from "${updated.fullName}" as ${updated.status.replace("_", " ").toLowerCase()}.`,
  });

  res.json({ enquiry: updated });
});

router.delete("/enquiries/:id", async (req, res) => {
  const user = req.user!;
  await db.delete(enquiries).where(eq(enquiries.id, req.params.id));
  await logAction(user, { action: "deleted", resourceType: "Enquiry", resourceId: req.params.id, description: "deleted an enquiry." });
  res.json({ ok: true });
});

/* -------------------------------- Dashboard ----------------------------------- */

router.get("/dashboard", async (_req, res) => {
  const [
    [{ value: lawyerCount }],
    [{ value: practiceAreaCount }],
    [{ value: publishedCount }],
    [{ value: draftCount }],
    [{ value: unreadCount }],
    [{ value: testimonialCount }],
  ] = await Promise.all([
    db.select({ value: count() }).from(lawyers),
    db.select({ value: count() }).from(practiceAreas),
    db.select({ value: count() }).from(blogPosts).where(eq(blogPosts.status, "PUBLISHED")),
    db.select({ value: count() }).from(blogPosts).where(eq(blogPosts.status, "DRAFT")),
    db.select({ value: count() }).from(enquiries).where(eq(enquiries.status, "NEW")),
    db.select({ value: count() }).from(testimonials).where(eq(testimonials.published, true)),
  ]);

  const recentEnquiries = await db.select().from(enquiries).orderBy(desc(enquiries.createdAt)).limit(5);
  const recentActivity = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(6);

  res.json({
    lawyerCount,
    practiceAreaCount,
    publishedCount,
    draftCount,
    unreadCount,
    testimonialCount,
    recentEnquiries,
    recentActivity,
  });
});

export default router;
