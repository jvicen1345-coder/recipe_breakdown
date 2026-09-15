import { NextResponse } from "next/server";

import { requireVerifiedUserId } from "@/lib/auth";
import { awardPoints, countSubmissionsThisWeek, getTrustInfo, POINTS_PER_SUBMISSION, runAiPreScreening } from "@/lib/community";
import { draftSubmissionSchema, submitSubmissionSchema, toCommunitySubmissionDto } from "@/lib/communitySubmissionTypes";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const submissions = await prisma.communitySubmission.findMany({
    where: { submittedByUserId: auth.userId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ submissions: submissions.map(toCommunitySubmissionDto) });
}

export async function POST(request: Request) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);

  if (body?.action !== "submit") {
    const parsed = draftSubmissionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission." }, { status: 400 });
    }
    const data = parsed.data;
    const created = await prisma.communitySubmission.create({
      data: {
        submittedByUserId: auth.userId,
        status: "draft",
        title: data.title,
        description: data.description ?? "",
        cuisineType: data.cuisineType ?? null,
        dietTagsJson: JSON.stringify(data.dietTags ?? []),
        cookTimeMinutes: data.cookTimeMinutes ?? null,
        difficulty: data.difficulty ?? null,
        ingredientsJson: JSON.stringify(data.ingredients ?? []),
        instructionsJson: JSON.stringify(data.instructions ?? []),
        story: data.story ?? "",
        photoUrl: data.photoUrl ?? null,
        photoWidth: data.photoWidth ?? null,
        photoHeight: data.photoHeight ?? null,
        nutritionJson: data.nutrition ? JSON.stringify(data.nutrition) : null,
      },
    });
    return NextResponse.json({ submission: toCommunitySubmissionDto(created) });
  }

  const parsed = submitSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid submission." }, { status: 400 });
  }
  const data = parsed.data;

  const trust = await getTrustInfo(auth.userId);
  const submittedThisWeek = await countSubmissionsThisWeek(auth.userId);
  if (submittedThisWeek >= trust.weeklySubmissionLimit) {
    return NextResponse.json(
      {
        error:
          trust.level === "flagged"
            ? "You've reached your weekly submission limit — thanks for your patience while we review your recent ones 🌸"
            : `You've hit your limit of ${trust.weeklySubmissionLimit} submissions this week — try again soon! 🌸`,
      },
      { status: 429 },
    );
  }

  const aiFlags = await runAiPreScreening({
    submittedByUserId: auth.userId,
    story: data.story,
    ingredients: data.ingredients,
    instructions: data.instructions,
    photoFlaggedScreenshot: false,
  });

  const created = await prisma.communitySubmission.create({
    data: {
      submittedByUserId: auth.userId,
      status: aiFlags.length > 0 ? "pending_admin" : "pending_community",
      title: data.title,
      description: data.description,
      cuisineType: data.cuisineType,
      dietTagsJson: JSON.stringify(data.dietTags),
      cookTimeMinutes: data.cookTimeMinutes,
      difficulty: data.difficulty,
      ingredientsJson: JSON.stringify(data.ingredients),
      instructionsJson: JSON.stringify(data.instructions),
      story: data.story,
      photoUrl: data.photoUrl,
      photoWidth: data.photoWidth,
      photoHeight: data.photoHeight,
      nutritionJson: data.nutrition ? JSON.stringify(data.nutrition) : null,
      aiFlagsJson: JSON.stringify(aiFlags),
      submittedAt: new Date(),
    },
  });

  const points = await awardPoints(auth.userId, POINTS_PER_SUBMISSION);

  return NextResponse.json({
    submission: toCommunitySubmissionDto(created),
    pointsAwarded: POINTS_PER_SUBMISSION,
    points,
  });
}
