import { Request, Response, NextFunction } from "express";
import { getDb } from "./db.js";
import { users, sessions } from "../shared/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { validateCsrfToken } from "./security.js";

const SALT_ROUNDS = 10;
const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function createSession(userId: string) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  const db = getDb();

  const [session] = await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  }).returning();

  return session;
}

export async function getSession(token: string) {
  const db = getDb();
  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session;
}

export async function getSessionUser(token: string) {
  const session = await getSession(token);
  if (!session) return null;

  const db = getDb();
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return user || null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.session_token;

  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const session = await getSession(token);
  if (!session) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }

  req.user = user;
  req.sessionId = session.id;
  return requireCsrfToken(req, res, next);
}

export function requireCsrfToken(req: Request, res: Response, next: NextFunction) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase())) {
    return next();
  }

  const csrfToken = req.get("X-CSRF-Token") || "";
  if (!req.sessionId || !validateCsrfToken(req.sessionId, csrfToken)) {
    return res.status(403).json({
      error: "Invalid or missing CSRF token",
      code: "CSRF_INVALID",
    });
  }

  return next();
}

declare global {
  namespace Express {
    interface Request {
      user?: typeof users.$inferSelect;
      sessionId?: string;
    }
  }
}
