import { NextResponse } from "next/server";

// Used by Railway's healthcheck to confirm a new deploy is actually serving
// requests before it takes over traffic from the previous one.
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
