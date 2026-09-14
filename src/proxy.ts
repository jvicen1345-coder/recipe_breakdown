import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

// Optimistic auth check only (per Next.js's guidance for Proxy) — every route handler
// and server page still verifies the session itself via getSessionUserId() before
// touching the database. This just keeps signed-out visitors off protected pages/APIs
// and signed-in users off the login/signup forms.
const PUBLIC_PAGE_ROUTES = new Set(["/login", "/signup"]);
const PUBLIC_API_ROUTES = new Set(["/api/auth/login", "/api/auth/signup"]);

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const userId = verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (PUBLIC_PAGE_ROUTES.has(pathname)) {
    if (userId) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (PUBLIC_API_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  if (!userId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest).*)",
  ],
};
