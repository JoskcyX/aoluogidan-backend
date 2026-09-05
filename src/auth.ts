import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { Request, Response, NextFunction } from "express";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { rateLimit, getClientIp } from "@/rate-limit";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "EDITOR";
};

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set.");
  return new TextEncoder().encode(secret);
}

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60; // 8 hours, matches the original NextAuth config

export async function issueSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ id: user.id, name: user.name, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.id || !payload.email || !payload.role) return null;
    return {
      id: payload.id as string,
      name: (payload.name as string) ?? "",
      email: payload.email as string,
      role: payload.role as "SUPER_ADMIN" | "EDITOR",
    };
  } catch {
    return null;
  }
}

/**
 * Verifies a login (email + password), same rules as the original NextAuth
 * Credentials provider: rate-limited per IP and per email, generic failure
 * message either way so we don't leak which admin emails exist.
 */
export async function authenticate(
  email: string,
  password: string,
  ip: string
): Promise<{ user: SessionUser } | { error: string; status: number }> {
  const normalizedEmail = email.toLowerCase().trim();

  const ipLimit = rateLimit(`login-ip:${ip}`, { limit: 20, windowMs: 15 * 60 * 1000 });
  const emailLimit = rateLimit(`login-email:${normalizedEmail}`, { limit: 8, windowMs: 15 * 60 * 1000 });
  if (!ipLimit.allowed || !emailLimit.allowed) {
    return { error: "Too many sign-in attempts. Please wait a few minutes and try again.", status: 429 };
  }

  const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

  if (!user || !user.isActive) {
    return { error: "Incorrect email or password.", status: 401 };
  }

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) {
    return { error: "Incorrect email or password.", status: 401 };
  }

  return { user: { id: user.id, name: user.name, email: user.email, role: user.role } };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

function extractToken(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  return undefined;
}

/** Express middleware: 401s unless a valid session token is present. */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = await verifySessionToken(extractToken(req));
  if (!user) {
    return res.status(401).json({ error: "You must be signed in to do that." });
  }
  req.user = user;
  next();
}

/** Express middleware: 403s unless the authenticated user is a SUPER_ADMIN. */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "SUPER_ADMIN") {
    return res.status(403).json({ error: "You don't have permission to do that." });
  }
  next();
}

export { getClientIp };
