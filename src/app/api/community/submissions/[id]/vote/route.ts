import { NextResponse } from "next/server";
import { z } from "zod";

import { requireVerifiedUserId } from "@/lib/auth";
import { getTrustInfo, tallyVotes } from "@/lib/community";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

const voteSchema = z.object({ vote: z.enum(["yes", "not_sure", "no"]) });

export async function POST(request: Request, { params }: Params) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const trust = await getTrustInfo(auth.userId);
  if (trust.level !== "trusted") {
    return NextResponse.json({ error: "Only Trusted Chefs can review community submissions." }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = voteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid vote." }, { status: 400 });
  }

  const submission = await prisma.communitySubmission.findUnique({ where: { id } });
  if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  if (submission.status !== "pending_community") {
    return NextResponse.json({ error: "This submission isn't awaiting community review anymore." }, { status: 409 });
  }
  if (submission.submittedByUserId === auth.userId) {
    return NextResponse.json({ error: "You can't review your own submission." }, { status: 403 });
  }

  await prisma.submissionVote.upsert({
    where: { submissionId_voterUserId: { submissionId: id, voterUserId: auth.userId } },
    create: { submissionId: id, voterUserId: auth.userId, vote: parsed.data.vote },
    update: { vote: parsed.data.vote },
  });

  const votes = await prisma.submissionVote.findMany({ where: { submissionId: id } });
  const outcome = tallyVotes(votes);

  if (outcome === "advance" || outcome === "manual_review") {
    await prisma.communitySubmission.update({ where: { id }, data: { status: "pending_admin" } });
  } else if (outcome === "auto_reject") {
    await prisma.communitySubmission.update({
      where: { id },
      data: {
        status: "auto_rejected",
        reviewedAt: new Date(),
        rejectionReason: "Our community felt this didn't quite feel like an original homemade recipe this time.",
      },
    });
  }

  return NextResponse.json({ ok: true, outcome });
}
