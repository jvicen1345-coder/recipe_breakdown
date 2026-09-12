import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { analyzeRecipe } from "./analyze";
import { extractAudio, extractFrames } from "./media";
import { prisma } from "./prisma";
import { cleanupWorkDir, downloadTikTok } from "./tiktok";
import { transcribeAudio } from "./transcribe";

export const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

export class RecipeAlreadyExistsError extends Error {
  constructor(public readonly recipeId: string) {
    super("This TikTok link has already been saved.");
  }
}

/**
 * Runs the full pipeline for a saved TikTok link: download the video, pull audio +
 * sample frames, transcribe the narration, ask Claude for a structured recipe
 * breakdown, and persist the result. Scratch files are always cleaned up.
 */
export async function createRecipeFromUrl(url: string, userNotes?: string) {
  const existing = await prisma.recipe.findUnique({ where: { sourceUrl: url } });
  if (existing) {
    throw new RecipeAlreadyExistsError(existing.id);
  }

  const { metadata, videoPath, workDir } = await downloadTikTok(url);

  try {
    const [audioPath, framePaths] = await Promise.all([
      extractAudio(videoPath, workDir).catch((err) => {
        console.error("[pipeline] audio extraction failed, continuing without transcript:", err);
        return null;
      }),
      extractFrames(videoPath, workDir, { count: 5 }).catch((err) => {
        console.error("[pipeline] frame extraction failed, continuing without frames:", err);
        return [] as string[];
      }),
    ]);

    const transcript = audioPath ? await transcribeAudio(audioPath) : null;

    const analysis = await analyzeRecipe({
      sourceUrl: metadata.webpageUrl,
      caption: metadata.description,
      transcript,
      userNotes: userNotes?.trim() || null,
      durationSeconds: metadata.durationSeconds,
      framePaths,
    });

    const id = randomUUID();
    const thumbnailPath = await saveThumbnail(id, framePaths);

    const recipe = await prisma.recipe.create({
      data: {
        id,
        sourceUrl: metadata.webpageUrl,
        title: analysis.title,
        authorHandle: metadata.uploader,
        thumbnailPath,
        caption: metadata.description || null,
        transcript,
        userNotes: userNotes?.trim() || null,
        durationSeconds: metadata.durationSeconds,
        servings: analysis.servings,
        totalTimeMinutes: analysis.totalTimeMinutes,
        difficulty: analysis.difficulty,
        proteinType: analysis.proteinType,
        dietType: analysis.dietType,
        priceLevel: analysis.priceLevel,
        estimatedPriceUsd: analysis.estimatedPriceUsd,
        ingredientsJson: JSON.stringify(analysis.ingredients),
        instructionsJson: JSON.stringify(analysis.instructions),
        tipsJson: JSON.stringify(analysis.tips),
        confidenceNotes: analysis.confidenceNotes,
      },
    });

    return recipe;
  } finally {
    await cleanupWorkDir(workDir);
  }
}

/** Copies a representative extracted frame into permanent local storage as the recipe's thumbnail. */
async function saveThumbnail(recipeId: string, framePaths: string[]): Promise<string | null> {
  if (framePaths.length === 0) return null;
  const chosen = framePaths[Math.floor(framePaths.length / 2)];
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    const filename = `${recipeId}.jpg`;
    await fs.copyFile(chosen, path.join(UPLOADS_DIR, filename));
    return filename;
  } catch (err) {
    console.error("[pipeline] failed to save thumbnail:", err);
    return null;
  }
}
