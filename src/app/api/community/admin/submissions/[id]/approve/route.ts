import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/admin";
import { getSessionUserId } from "@/lib/auth";
import { awardPoints, POINTS_PER_APPROVAL } from "@/lib/community";
import { estimateSubmissionNutrition } from "@/lib/estimateSubmissionNutrition";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

function inferDietType(tags: string[]): string {
  const lower = tags.map((t) => t.toLowerCase());
  if (lower.includes("vegan")) return "vegan";
  if (lower.includes("vegetarian")) return "vegetarian";
  if (lower.includes("pescatarian")) return "pescatarian";
  return "omnivore";
}

export async function POST(_request: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId || !(await isAdminUser(userId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;
  const submission = await prisma.communitySubmission.findUnique({ where: { id } });
  if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
  if (submission.status !== "pending_admin") {
    return NextResponse.json({ error: "This submission isn't awaiting admin approval." }, { status: 409 });
  }

  const ingredients: { amount: string; unit: string; name: string }[] = JSON.parse(submission.ingredientsJson);
  const instructions: string[] = JSON.parse(submission.instructionsJson);
  const dietTags: string[] = JSON.parse(submission.dietTagsJson);

  // The submission wizard collects ingredients as {amount, unit, name}, but every
  // other Recipe consumer (pantry matching, grocery lists, RecipeCard) expects the
  // {item, quantity} shape used everywhere else — so translate on the way in.
  const recipeIngredientsJson = JSON.stringify(
    ingredients.map((ing) => ({
      item: ing.name,
      quantity: [ing.amount, ing.unit].filter(Boolean).join(" ").trim() || null,
    })),
  );

  let nutritionJson = submission.nutritionJson;
  const providedNutrition = submission.nutritionJson ? JSON.parse(submission.nutritionJson) : null;
  const hasUsableNutrition =
    providedNutrition && Object.values(providedNutrition).some((v) => typeof v === "number");

  if (!hasUsableNutrition) {
    const estimated = await estimateSubmissionNutrition({
      title: submission.title,
      servings: null,
      ingredients,
      instructions,
    });
    if (estimated) nutritionJson = JSON.stringify(estimated);
  }

  const recipe = await prisma.recipe.create({
    data: {
      sourceUrl: `community-submission:${submission.id}`,
      title: submission.title,
      difficulty: submission.difficulty,
      dietType: inferDietType(dietTags),
      totalTimeMinutes: submission.cookTimeMinutes,
      ingredientsJson: recipeIngredientsJson,
      instructionsJson: submission.instructionsJson,
      nutritionJson,
      userNotes: submission.description,
      thumbnailUrl: submission.photoUrl,
      createdByUserId: submission.submittedByUserId,
    },
  });

  await prisma.communitySubmission.update({
    where: { id },
    data: { status: "approved", approvedRecipeId: recipe.id, reviewedAt: new Date() },
  });

  await awardPoints(submission.submittedByUserId, POINTS_PER_APPROVAL);

  return NextResponse.json({ ok: true, recipeId: recipe.id });
}
