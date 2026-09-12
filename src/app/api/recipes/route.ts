import { NextResponse } from "next/server";
import { z } from "zod";

import { ExternalToolError } from "@/lib/exec";
import { prisma } from "@/lib/prisma";
import { createRecipeFromUrl, RecipeAlreadyExistsError } from "@/lib/pipeline";
import { InvalidTikTokUrlError } from "@/lib/tiktok";
import { toRecipeDto } from "@/lib/types";

// Downloading, transcribing, and analyzing a video can take well over a minute.
export const maxDuration = 300;

const createRecipeSchema = z.object({
  url: z.string().trim().min(1, "A TikTok link is required."),
  notes: z.string().trim().max(2000).optional(),
});

export async function GET() {
  const recipes = await prisma.recipe.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ recipes: recipes.map(toRecipeDto) });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createRecipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  try {
    const recipe = await createRecipeFromUrl(parsed.data.url, parsed.data.notes);
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
