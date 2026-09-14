import { randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";

// No next/headers import here on purpose — this module is shared between
// route handlers/pages (which read cookies via next/headers) and proxy.ts
// (which reads cookies straight off the request), so it stays framework-agnostic.

export const SESSION_COOKIE_NAME = "ce_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

// Mirrors prisma.config.ts's DATABASE_URL fallback: never crash local dev over a
// missing env var, but a real AUTH_SECRET must be set in production or sessions
// (and the password reset flow, if one is ever added) could be forged.
const AUTH_SECRET = process.env.AUTH_SECRET || "dev-only-insecure-auth-secret-change-me";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function sign(value: string): string {
  return createHmac("sha256", AUTH_SECRET).update(value).digest("base64url");
}

export function createSessionToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Date.now() + SESSION_MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const { userId, exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof userId !== "string" || typeof exp !== "number" || Date.now() > exp) return null;
    return userId;
  } catch {
    return null;
  }
}
