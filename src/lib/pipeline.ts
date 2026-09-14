import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { analyzeRecipe } from "./analyze";
import { commandExists } from "./exec";
import { extractAudio, extractFrames } from "./media";
import { fetchTikTokOEmbed } from "./oembed";
import { prisma } from "./prisma";
import { assertTikTokUrl, cleanupWorkDir, downloadTikTok, YT_DLP_BIN } from "./tiktok";
import { transcribeAudio } from "./transcribe";

export const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

export class RecipeAlreadyExistsError extends Error {
  constructor(public readonly recipeId: string) {
    super("This TikTok link has already been saved.");
  }
}

/**
 * Saves a TikTok link as a structured recipe. Picks between two pipelines
 * depending on what's actually available on the host:
 *
 * - Full (yt-dlp + ffmpeg present, e.g. the Docker image): downloads the video,
 *   extracts audio + sample frames, transcribes narration, and analyzes all of it.
 * - Lite (no yt-dlp, e.g. Vercel's serverless runtime): reads the caption/author/
 *   thumbnail from TikTok's public oEmbed endpoint and analyzes just that (plus
 *   any notes typed in) — no video download, no local disk usage.
 */
export async function createRecipeFromUrl(url: string, userNotes?: string) {
  assertTikTokUrl(url);

  const existing = await prisma.recipe.findUnique({ where: { sourceUrl: url } });
  if (existing) {
    throw new RecipeAlreadyExistsError(existing.id);
  }

  const hasYtDlp = await commandExists(YT_DLP_BIN);
  return hasYtDlp ? createRecipeFull(url, userNotes) : createRecipeLite(url, userNotes);
}

/**
 * Whether this host can run the full pipeline (yt-dlp present). Collection import
 * needs yt-dlp just to list a Collection's contents, so it's only worth offering
 * in the UI when this is true — e.g. not on Vercel's serverless runtime.
 */
export async function isFullPipelineAvailable(): Promise<boolean> {
  return commandExists(YT_DLP_BIN);
}

async function createRecipeFull(url: string, userNotes?: string) {
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

async function createRecipeLite(url: string, userNotes?: string) {
  const meta = await fetchTikTokOEmbed(url);

  const analysis = await analyzeRecipe({
    sourceUrl: url,
    caption: meta.caption,
    transcript: null,
    userNotes: userNotes?.trim() || null,
    durationSeconds: null,
    framePaths: [],
  });

  return prisma.recipe.create({
    data: {
      id: randomUUID(),
      sourceUrl: url,
      title: analysis.title,
      authorHandle: meta.authorHandle,
      thumbnailUrl: meta.thumbnailUrl,
      caption: meta.caption,
      userNotes: userNotes?.trim() || null,
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
