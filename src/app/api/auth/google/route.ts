import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { GOOGLE_OAUTH_STATE_COOKIE, buildGoogleAuthUrl, isGoogleAuthConfigured } from "@/lib/googleAuth";
import { getRequestOrigin } from "@/lib/requestOrigin";

// Kicks off "Continue with Google": stash a random CSRF token in a short-lived
// cookie, then send the browser to Google's consent screen with that same token
// as `state` — the callback route checks the two match before trusting the code.
export async function GET(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google-not-configured", request.url));
  }

  const state = randomBytes(16).toString("hex");
  const store = await cookies();
  store.set(GOOGLE_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  const origin = getRequestOrigin(request);
  return NextResponse.redirect(buildGoogleAuthUrl(origin, state));
}
