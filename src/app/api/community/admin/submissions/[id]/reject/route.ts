import { NextResponse } from "next/server";
import { z } from "zod";

import { isAdminUser } from "@/lib/admin";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

const rejectSchema = z.object({ reason: z.string().trim().min(1).max(1000) });

export async function POST(request: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId || !(await isAdminUser(userId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = rejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "A reason is required." }, { status: 400 });
  }

  const submission = await prisma.communitySubmission.findUnique({ where: { id } });
  if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  if (submission.status !== "pending_admin") {
    return NextResponse.json({ error: "This submission isn't awaiting admin approval." }, { status: 409 });
  }

  await prisma.communitySubmission.update({
    where: { id },
    data: { status: "rejected", rejectionReason: parsed.data.reason, reviewedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
