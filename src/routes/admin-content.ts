import { Router } from "express";
import { and, asc, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  practiceAreas,
  practiceAreaServices,
  lawyers,
  lawyerPracticeAreas,
} from "@/db/schema";
import { practiceAreaSchema } from "@/validations/practice-area";
import { lawyerSchema } from "@/validations/lawyer";
import { requireAuth } from "@/auth";
import { logAction } from "@/audit";
import { ensureUniqueSlug } from "@/slug";
import { storage } from "@/storage";

const router = Router();
router.use(requireAuth);

/* ----------------------------- Practice Areas ---------------------------- */

router.get("/practice-areas", async (_req, res) => {
  const rows = await db.select().from(practiceAreas).orderBy(asc(practiceAreas.displayOrder));
  res.json({ practiceAreas: rows });
});

router.get("/practice-areas/:id", async (req, res) => {
  const [area] = await db.select().from(practiceAreas).where(eq(practiceAreas.id, req.params.id)).limit(1);
  if (!area) return res.status(404).json({ error: "Practice area not found." });

  const services = await db
    .select()
    .from(practiceAreaServices)
    .where(eq(practiceAreaServices.practiceAreaId, area.id))
    .orderBy(asc(practiceAreaServices.displayOrder));
  const lawyerLinks = await db
    .select({ lawyerId: lawyerPracticeAreas.lawyerId })
    .from(lawyerPracticeAreas)
    .where(eq(lawyerPracticeAreas.practiceAreaId, area.id));

  res.json({
    practiceArea: area,
    services: services.map((s) => s.name),
    lawyerIds: lawyerLinks.map((l) => l.lawyerId),
  });
});

router.post("/practice-areas", async (req, res) => {
  const user = req.user!;
  const parsed = practiceAreaSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });

  const { services, lawyerIds, ...data } = parsed.data;
  const slug = await ensureUniqueSlug(data.name, async (candidate) => {
    const [existing] = await db
      .select({ id: practiceAreas.id })
      .from(practiceAreas)
      .where(eq(practiceAreas.slug, candidate))
      .limit(1);
    return !!existing;
  });

  const [created] = await db.insert(practiceAreas).values({ ...data, slug }).returning();

  if (services.length > 0) {
    await db
      .insert(practiceAreaServices)
      .values(services.map((name, i) => ({ practiceAreaId: created.id, name, displayOrder: i })));
  }
  if (lawyerIds.length > 0) {
    await db.insert(lawyerPracticeAreas).values(lawyerIds.map((lawyerId) => ({ lawyerId, practiceAreaId: created.id })));
  }

  await logAction(user, {
    action: "created",
    resourceType: "Practice Area",
    resourceId: created.id,
    description: `added the practice area "${created.name}".`,
  });

  res.status(201).json({ practiceArea: created });
});

router.patch("/practice-areas/:id", async (req, res) => {
  const user = req.user!;
  const [existing] = await db.select().from(practiceAreas).where(eq(practiceAreas.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Practice area not found." });

  const body = req.body ?? {};
  if (Object.keys(body).length === 1 && "published" in body) {
    const [updated] = await db
      .update(practiceAreas)
      .set({ published: Boolean(body.published) })
      .where(eq(practiceAreas.id, req.params.id))
      .returning();
    await logAction(user, {
      action: updated.published ? "published" : "unpublished",
      resourceType: "Practice Area",
      resourceId: updated.id,
      description: `${updated.published ? "published" : "unpublished"} "${updated.name}".`,
    });
    return res.json({ practiceArea: updated });
  }

  const parsed = practiceAreaSchema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });

  const { services, lawyerIds, ...data } = parsed.data;

  let slug = existing.slug;
  if (data.name !== existing.name) {
    slug = await ensureUniqueSlug(data.name, async (candidate) => {
      const [taken] = await db
        .select({ id: practiceAreas.id })
        .from(practiceAreas)
        .where(and(eq(practiceAreas.slug, candidate), ne(practiceAreas.id, existing.id)))
        .limit(1);
      return !!taken;
    });
  }

  const [updated] = await db
    .update(practiceAreas)
    .set({ ...data, slug })
    .where(eq(practiceAreas.id, req.params.id))
    .returning();

  await db.delete(practiceAreaServices).where(eq(practiceAreaServices.practiceAreaId, updated.id));
  if (services.length > 0) {
    await db
      .insert(practiceAreaServices)
      .values(services.map((name, i) => ({ practiceAreaId: updated.id, name, displayOrder: i })));
  }

  await db.delete(lawyerPracticeAreas).where(eq(lawyerPracticeAreas.practiceAreaId, updated.id));
  if (lawyerIds.length > 0) {
    await db.insert(lawyerPracticeAreas).values(lawyerIds.map((lawyerId) => ({ lawyerId, practiceAreaId: updated.id })));
  }

  await logAction(user, {
    action: "updated",
    resourceType: "Practice Area",
    resourceId: updated.id,
    description: `updated the practice area "${updated.name}".`,
  });

  res.json({ practiceArea: updated });
});

router.delete("/practice-areas/:id", async (req, res) => {
  const user = req.user!;
  const [existing] = await db.select().from(practiceAreas).where(eq(practiceAreas.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Practice area not found." });

  await db.delete(practiceAreas).where(eq(practiceAreas.id, req.params.id));
  await logAction(user, {
    action: "deleted",
    resourceType: "Practice Area",
    resourceId: req.params.id,
    description: `deleted the practice area "${existing.name}".`,
  });

  res.json({ ok: true });
});

/* --------------------------------- Lawyers -------------------------------- */

router.get("/lawyers", async (req, res) => {
  const search = typeof req.query.q === "string" ? req.query.q.trim() : undefined;
  const rows = await db
    .select()
    .from(lawyers)
    .where(search ? or(ilike(lawyers.name, `%${search}%`), ilike(lawyers.position, `%${search}%`)) : undefined)
    .orderBy(asc(lawyers.displayOrder));
  res.json({ lawyers: rows });
});

router.get("/lawyers/:id", async (req, res) => {
  const [lawyer] = await db.select().from(lawyers).where(eq(lawyers.id, req.params.id)).limit(1);
  if (!lawyer) return res.status(404).json({ error: "Lawyer not found." });

  const links = await db
    .select({ practiceAreaId: lawyerPracticeAreas.practiceAreaId })
    .from(lawyerPracticeAreas)
    .where(eq(lawyerPracticeAreas.lawyerId, lawyer.id));

  res.json({ lawyer, practiceAreaIds: links.map((l) => l.practiceAreaId) });
});

router.post("/lawyers", async (req, res) => {
  const user = req.user!;
  const parsed = lawyerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });

  const { practiceAreaIds, ...data } = parsed.data;
  const slug = await ensureUniqueSlug(data.name, async (candidate) => {
    const [existing] = await db.select({ id: lawyers.id }).from(lawyers).where(eq(lawyers.slug, candidate)).limit(1);
    return !!existing;
  });

  const [created] = await db
    .insert(lawyers)
    .values({ ...data, slug, email: data.email || null, linkedinUrl: data.linkedinUrl || null })
    .returning();

  if (practiceAreaIds.length > 0) {
    await db
      .insert(lawyerPracticeAreas)
      .values(practiceAreaIds.map((paId) => ({ lawyerId: created.id, practiceAreaId: paId })));
  }

  await logAction(user, {
    action: "created",
    resourceType: "Lawyer",
    resourceId: created.id,
    description: `added the lawyer "${created.name}".`,
  });

  res.status(201).json({ lawyer: created });
});

router.patch("/lawyers/:id", async (req, res) => {
  const user = req.user!;
  const [existing] = await db.select().from(lawyers).where(eq(lawyers.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Lawyer not found." });

  const body = req.body ?? {};
  if (Object.keys(body).length === 1 && "published" in body) {
    const [updated] = await db
      .update(lawyers)
      .set({ published: Boolean(body.published) })
      .where(eq(lawyers.id, req.params.id))
      .returning();
    await logAction(user, {
      action: updated.published ? "published" : "unpublished",
      resourceType: "Lawyer",
      resourceId: updated.id,
      description: `${updated.published ? "published" : "unpublished"} the lawyer profile "${updated.name}".`,
    });
    return res.json({ lawyer: updated });
  }

  const parsed = lawyerSchema.safeParse(body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid data." });

  const { practiceAreaIds, ...data } = parsed.data;

  let slug = existing.slug;
  if (data.name !== existing.name) {
    slug = await ensureUniqueSlug(data.name, async (candidate) => {
      const [taken] = await db
        .select({ id: lawyers.id })
        .from(lawyers)
        .where(and(eq(lawyers.slug, candidate), ne(lawyers.id, existing.id)))
        .limit(1);
      return !!taken;
    });
  }

  const [updated] = await db
    .update(lawyers)
    .set({ ...data, slug, email: data.email || null, linkedinUrl: data.linkedinUrl || null })
    .where(eq(lawyers.id, req.params.id))
    .returning();

  await db.delete(lawyerPracticeAreas).where(eq(lawyerPracticeAreas.lawyerId, updated.id));
  if (practiceAreaIds.length > 0) {
    await db
      .insert(lawyerPracticeAreas)
      .values(practiceAreaIds.map((paId) => ({ lawyerId: updated.id, practiceAreaId: paId })));
  }

  await logAction(user, {
    action: "updated",
    resourceType: "Lawyer",
    resourceId: updated.id,
    description: `updated the lawyer profile "${updated.name}".`,
  });

  res.json({ lawyer: updated });
});

router.delete("/lawyers/:id", async (req, res) => {
  const user = req.user!;
  const [existing] = await db.select().from(lawyers).where(eq(lawyers.id, req.params.id)).limit(1);
  if (!existing) return res.status(404).json({ error: "Lawyer not found." });

  if (existing.photoUrl) {
    await storage.delete(existing.photoUrl);
  }

  await db.delete(lawyers).where(eq(lawyers.id, req.params.id));

  await logAction(user, {
    action: "deleted",
    resourceType: "Lawyer",
    resourceId: req.params.id,
    description: `deleted the lawyer profile "${existing.name}".`,
  });

  res.json({ ok: true });
});

export default router;
