import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId, requireVerifiedUserId } from "@/lib/auth";
import { ExternalToolError } from "@/lib/exec";
import { prisma } from "@/lib/prisma";
import { createRecipeFromUrl, RecipeAlreadyExistsError } from "@/lib/pipeline";
import { FREE_RECIPE_LIMIT, isPro } from "@/lib/plan";
import { InvalidTikTokUrlError } from "@/lib/tiktok";
import { toRecipeDto } from "@/lib/types";

// Downloading, transcribing, and analyzing a video can take well over a minute.
export const maxDuration = 300;

const createRecipeSchema = z.object({
  url: z.string().trim().min(1, "A TikTok link is required."),
  notes: z.string().trim().max(2000).optional(),
});

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const recipes = await prisma.recipe.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ recipes: recipes.map(toRecipeDto) });
}

export async function POST(request: Request) {
  const auth = await requireVerifiedUserId();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = createRecipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: auth.userId } });
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  if (!isPro(user)) {
    const savedCount = await prisma.recipe.count({ where: { userId: user.id } });
    if (savedCount >= FREE_RECIPE_LIMIT) {
      return NextResponse.json(
        { error: "You've hit the free plan's 10-recipe limit.", reason: "recipe-limit" },
        { status: 402 },
      );
    }
  }

  try {
    const recipe = await createRecipeFromUrl(parsed.data.url, user.id, parsed.data.notes);
    return NextResponse.json({ recipe: toRecipeDto(recipe) }, { status: 201 });
  } catch (err) {
    if (err instanceof InvalidTikTokUrlError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof RecipeAlreadyExistsError) {
      return NextResponse.json(
        { error: err.message, recipeId: err.recipeId },
        { status: 409 },
      );
    }
    if (err instanceof ExternalToolError) {
      return NextResponse.json(
        { error: `Couldn't process that video (${err.tool}): ${err.message}` },
        { status: 502 },
      );
    }
    console.error("[api/recipes] failed to analyze recipe:", err);
    const message = err instanceof Error ? err.message : "Failed to analyze that video.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
