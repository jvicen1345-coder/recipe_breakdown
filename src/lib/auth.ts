import { cache } from "react";
import { cookies } from "next/headers";

import { prisma } from "./prisma";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  VERIFICATION_TOKEN_MAX_AGE_MS,
  createSessionToken,
  generateVerificationToken,
  verifySessionToken,
} from "./session";

// Memoized per request (React's cache()) so every route handler, page, and layout
// that calls this during one render pass shares a single cookie read/verify.
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE_NAME)?.value);
});

export type VerifiedUserResult = { ok: true; userId: string } | { ok: false; status: 401 | 403; error: string };

// Guards every mutation route (creating/editing/deleting shared data) — a signed-in
// but unverified "guest" account can browse everything but not change it. Read
// routes only need getSessionUserId(); this is for POST/PATCH/DELETE handlers.
export async function requireVerifiedUserId(): Promise<VerifiedUserResult> {
  const userId = await getSessionUserId();
  if (!userId) return { ok: false, status: 401, error: "Not signed in." };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } });
  if (!user) return { ok: false, status: 401, error: "Not signed in." };
  if (!user.emailVerified) {
    return {
      ok: false,
      status: 403,
      error: "Confirm your email to do this — check your inbox, or resend the link from your profile.",
    };
  }
  return { ok: true, userId };
}

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

/** Generates a fresh verification token for a user and saves it, replacing any previous one. */
export async function issueVerificationToken(userId: string): Promise<string> {
  const token = generateVerificationToken();
  await prisma.user.update({
    where: { id: userId },
    data: { verificationToken: token, verificationTokenExpiresAt: new Date(Date.now() + VERIFICATION_TOKEN_MAX_AGE_MS) },
  });
  return token;
}

export { hashPassword, verifyPassword } from "./session";
