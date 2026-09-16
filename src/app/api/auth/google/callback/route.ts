import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { setSessionCookie } from "@/lib/auth";
import { GOOGLE_OAUTH_STATE_COOKIE, fetchGoogleProfile, findOrCreateUserFromGoogleProfile } from "@/lib/googleAuth";
import { getRequestOrigin } from "@/lib/requestOrigin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = getRequestOrigin(request);
  const loginUrl = new URL("/login", origin);

  if (url.searchParams.get("error")) {
    loginUrl.searchParams.set("error", "google-denied");
    return NextResponse.redirect(loginUrl);
  }

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  store.delete(GOOGLE_OAUTH_STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    loginUrl.searchParams.set("error", "google-state-mismatch");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const profile = await fetchGoogleProfile(code, origin);
    const user = await findOrCreateUserFromGoogleProfile(profile);
    await setSessionCookie(user.id);
    return NextResponse.redirect(new URL("/", origin));
  } catch (err) {
    console.error("[api/auth/google/callback] Google sign-in failed:", err);
    loginUrl.searchParams.set("error", "google-failed");
    return NextResponse.redirect(loginUrl);
  }
}
