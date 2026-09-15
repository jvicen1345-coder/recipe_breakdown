import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/admin";
import { getSessionUserId } from "@/lib/auth";
import { toCommunitySubmissionDto } from "@/lib/communitySubmissionTypes";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId || !(await isAdminUser(userId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const submissions = await prisma.communitySubmission.findMany({
    where: { status: "pending_admin" },
    orderBy: { submittedAt: "asc" },
    include: { submittedBy: { select: { name: true, email: true } } },
  });

  return NextResponse.json({
    submissions: submissions.map((s) => ({
      ...toCommunitySubmissionDto(s),
      submitterName: s.submittedBy.name,
      submitterEmail: s.submittedBy.email,
    })),
  });
}
