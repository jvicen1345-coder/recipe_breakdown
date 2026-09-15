import { NextResponse } from "next/server";

import { requireVerifiedUserId } from "@/lib/auth";
import { heartPost } from "@/lib/madeIt";

interface Params {
  params: Promise<{ id: string }>;
}

// Permanent, one-time-per-user heart — see lib/madeIt.ts for the capped point award.
export async function POST(_request: Request, { params }: Params) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const result = await heartPost(id, auth.userId);
  if (!result.ok) return NextResponse.json({ error: "Couldn't heart that post." }, { status: 404 });

  return NextResponse.json({ ok: true, alreadyHearted: result.alreadyHearted });
}
