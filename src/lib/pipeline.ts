import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { analyzeRecipe } from "./analyze";
import { extractAudio, extractFrames } from "./media";
import { prisma } from "./prisma";
import { assertTikTokUrl, cleanupWorkDir, downloadTikTok } from "./tiktok";
import { transcribeAudio } from "./transcribe";

export const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

export class RecipeAlreadyExistsError extends Error {
  constructor(public readonly recipeId: string) {
    super("This TikTok link has already been saved.");
  }
}

/**
 * Saves a TikTok link as a structured recipe: downloads the video via yt-dlp,
 * extracts audio + sample frames via ffmpeg, transcribes narration, and sends
 * the caption/transcript/frames/notes to Claude for the structured breakdown.
 */
export async function createRecipeFromUrl(url: string, createdByUserId: string, userNotes?: string) {
  assertTikTokUrl(url);

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
    const thumbnailPath = await saveThumbnailFile(id, framePaths);

    return prisma.recipe.create({
      data: {
        id,
        createdByUserId,
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
        mealType: analysis.mealType,
        priceLevel: analysis.priceLevel,
        estimatedPriceUsd: analysis.estimatedPriceUsd,
        ingredientsJson: JSON.stringify(analysis.ingredients),
        instructionsJson: JSON.stringify(analysis.instructions),
        tipsJson: JSON.stringify(analysis.tips),
        nutritionJson: JSON.stringify(analysis.nutrition),
        confidenceNotes: analysis.confidenceNotes,
      },
    });
  } finally {
    await cleanupWorkDir(workDir);
  }
}

/** Copies a representative extracted frame into permanent local storage as the recipe's thumbnail. */
async function saveThumbnailFile(recipeId: string, framePaths: string[]): Promise<string | null> {
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
