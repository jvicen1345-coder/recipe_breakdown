import { NextResponse } from "next/server";

import { requireVerifiedUserId } from "@/lib/auth";
import { getTrustInfo } from "@/lib/community";
import { toCommunitySubmissionDto } from "@/lib/communitySubmissionTypes";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const trust = await getTrustInfo(auth.userId);
  if (trust.level !== "trusted") {
    return NextResponse.json({ submissions: [], isTrusted: false });
  }

  const submissions = await prisma.communitySubmission.findMany({
    where: {
      status: "pending_community",
      submittedByUserId: { not: auth.userId },
      votes: { none: { voterUserId: auth.userId } },
    },
    orderBy: { submittedAt: "asc" },
    take: 20,
  });

  return NextResponse.json({ submissions: submissions.map(toCommunitySubmissionDto), isTrusted: true });
}
