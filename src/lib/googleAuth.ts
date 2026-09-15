import { prisma } from "./prisma";

// "Continue with Google" — a standard OAuth 2.0 authorization-code flow. Optional,
// like the other third-party integrations in this app: without these two env vars
// the button simply doesn't appear (see isGoogleAuthConfigured), so local dev/testing
// never needs a Google Cloud project.
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const GOOGLE_OAUTH_STATE_COOKIE = "ce_oauth_state";

export function isGoogleAuthConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET);
}

export function googleCallbackUrl(origin: string): string {
  return `${origin}/api/auth/google/callback`;
}

export function buildGoogleAuthUrl(origin: string, state: string): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID!);
  url.searchParams.set("redirect_uri", googleCallbackUrl(origin));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export interface GoogleProfile {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string | null;
}

/** Exchanges an auth code for tokens, then fetches the account's profile. Throws on any failure. */
export async function fetchGoogleProfile(code: string, origin: string): Promise<GoogleProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleCallbackUrl(origin),
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) throw new Error(`Google token exchange failed: ${tokenRes.status}`);
  const tokens = await tokenRes.json();

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!profileRes.ok) throw new Error(`Google userinfo fetch failed: ${profileRes.status}`);
  const profile = await profileRes.json();

  if (typeof profile.sub !== "string" || typeof profile.email !== "string") {
    throw new Error("Google userinfo response missing sub/email.");
  }

  return {
    sub: profile.sub,
    email: profile.email.toLowerCase(),
    email_verified: Boolean(profile.email_verified),
    name: typeof profile.name === "string" ? profile.name : null,
  };
}

/**
 * Resolves a Google profile to a User row: matches by googleId (returning sign-in),
 * else by email (links Google onto an existing password account instead of creating
 * a duplicate), else creates a brand-new account. Split out from the callback route
 * so this account-linking logic can be exercised directly in tests.
 */
export async function findOrCreateUserFromGoogleProfile(profile: GoogleProfile) {
  const existingByGoogleId = await prisma.user.findUnique({ where: { googleId: profile.sub } });
  if (existingByGoogleId) return existingByGoogleId;

  const existingByEmail = await prisma.user.findUnique({ where: { email: profile.email } });
  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        googleId: profile.sub,
        emailVerified: existingByEmail.emailVerified || profile.email_verified,
        name: existingByEmail.name ?? profile.name,
      },
    });
  }

  return prisma.user.create({
    data: {
      email: profile.email,
      googleId: profile.sub,
      name: profile.name,
      emailVerified: profile.email_verified,
    },
  });
}
