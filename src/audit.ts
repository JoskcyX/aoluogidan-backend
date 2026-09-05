import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import type { SessionUser } from "@/auth";

export async function logAction(
  user: SessionUser,
  params: {
    action: string; // e.g. "created", "updated", "deleted", "published", "unpublished"
    resourceType: string; // e.g. "Lawyer", "Blog Post"
    resourceId?: string;
    description: string; // human-readable, e.g. "John published the article 'Understanding NDAs'"
  }
) {
  try {
    await db.insert(auditLogs).values({
      userId: user.id,
      userName: user.name,
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      description: params.description,
    });
  } catch (err) {
    // Auditing must never block the actual operation from succeeding.
    console.error("Failed to write audit log:", err);
  }
}
