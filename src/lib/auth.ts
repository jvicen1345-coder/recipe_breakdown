import { cache } from "react";
import { cookies } from "next/headers";

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  verifySessionToken,
} from "./session";

// The one account that can approve access requests (see AccessRequest in
// schema.prisma). Must be set via env var — see .env.example — so a real email
// never has to be hardcoded into source. Unset means no one is treated as the
// owner (fails closed rather than granting admin access to nobody in particular).
export const OWNER_EMAIL = (process.env.OWNER_EMAIL || "").trim().toLowerCase();

export function isOwnerEmail(email: string): boolean {
  return OWNER_EMAIL.length > 0 && email === OWNER_EMAIL;
}

// Memoized per request (React's cache()) so every route handler, page, and layout
// that calls this during one render pass shares a single cookie read/verify.
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value);
});

export async function setSessionCookie(userId: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export { hashPassword, verifyPassword } from "./session";
