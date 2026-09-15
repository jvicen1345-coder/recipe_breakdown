import { NextResponse } from "next/server";

import { requireVerifiedUserId } from "@/lib/auth";
import { reportPost } from "@/lib/madeIt";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: Params) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const result = await reportPost(id, auth.userId);
  if (!result.ok) return NextResponse.json({ error: "Couldn't report that post." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
