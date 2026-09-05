/**
 * Minimal in-memory sliding-window rate limiter for public endpoints
 * (contact form, consultation form, login attempts).
 *
 * This is intentionally simple and lives in process memory, which is fine
 * for a single server instance. If you deploy behind multiple instances or
 * a serverless platform that spins up fresh processes per request, replace
 * this with a shared store (Redis / Upstash) — the function signature below
 * is designed to be a drop-in swap.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  if (bucket.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  bucket.count += 1;
  return { allowed: true, remaining: limit - bucket.count };
}

/**
 * IMPORTANT: `X-Forwarded-For` is only trustworthy when every request
 * reaches this app through a proxy you control (Render's load balancer,
 * an nginx/ALB you operate, etc.) that overwrites the header rather than
 * passing through whatever the client sent. Render sets this correctly
 * by default. If this app is ever exposed directly to the internet
 * without such a proxy in front of it, a client can set an arbitrary
 * `X-Forwarded-For` value and get a fresh rate-limit bucket on every
 * request, defeating the per-IP limits on login/contact/consultation below.
 */
export function getClientIp(req: { headers: Record<string, string | string[] | undefined>; ip?: string }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return value.split(",")[0].trim();
  }
  const realIp = req.headers["x-real-ip"];
  if (realIp) return Array.isArray(realIp) ? realIp[0] : realIp;
  return req.ip ?? "unknown";
}
