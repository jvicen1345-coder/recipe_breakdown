import fs from "node:fs/promises";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export const recipeAnalysisSchema = z.object({
  title: z.string().min(1),
  servings: z.number().int().positive().nullable(),
  totalTimeMinutes: z.number().int().positive().nullable(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  proteinType: z.enum([
    "chicken",
    "beef",
    "pork",
    "seafood",
    "egg",
    "plant-based",
    "other",
    "none",
  ]),
  dietType: z.enum(["vegan", "vegetarian", "pescatarian", "omnivore"]),
  mealType: z.enum(["breakfast", "lunch", "dinner", "quick-bite"]),
  priceLevel: z.enum(["budget", "moderate", "splurge"]),
  estimatedPriceUsd: z.number().positive().nullable(),
  ingredients: z
    .array(
      z.object({
        item: z.string().min(1),
        quantity: z.string().nullable(),
      }),
    )
    .min(1),
  instructions: z.array(z.string().min(1)).min(1),
  tips: z.array(z.string()).default([]),
  nutrition: z.object({
    caloriesPerServing: z.number().positive().nullable(),
    proteinGrams: z.number().nonnegative().nullable(),
    carbsGrams: z.number().nonnegative().nullable(),
    fatGrams: z.number().nonnegative().nullable(),
    fiberGrams: z.number().nonnegative().nullable(),
    sugarGrams: z.number().nonnegative().nullable(),
    sodiumMg: z.number().nonnegative().nullable(),
  }),
  confidenceNotes: z.string().nullable(),
});

export type RecipeAnalysis = z.infer<typeof recipeAnalysisSchema>;

export interface RecipeAnalysisResult extends RecipeAnalysis {
  /** Path (from the input `framePaths`) of the frame best suited as a card thumbnail, or null if none were usable. */
  thumbnailFramePath: string | null;
}

const toolResponseSchema = recipeAnalysisSchema.extend({
  thumbnailFrameIndex: z.number().int().nonnegative().nullable(),
});

const TOOL_NAME = "submit_recipe_breakdown";

const RECIPE_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description:
    "Submits the structured recipe breakdown extracted from the cooking video.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short, appetizing name of the dish." },
      servings: { type: ["integer", "null"], description: "How many people the recipe serves." },
      totalTimeMinutes: {
        type: ["integer", "null"],
        description: "Total active + cook/bake time in minutes to make the dish.",
      },
      difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
      proteinType: {
        type: "string",
        enum: ["chicken", "beef", "pork", "seafood", "egg", "plant-based", "other", "none"],
        description: "Dominant protein in the dish, or 'none' if there isn't one.",
      },
      dietType: {
        type: "string",
        enum: ["vegan", "vegetarian", "pescatarian", "omnivore"],
      },
      mealType: {
        type: "string",
        enum: ["breakfast", "lunch", "dinner", "quick-bite"],
        description:
          "When this dish is typically eaten. Use 'quick-bite' for snacks, small plates, or anything meant to be thrown together fast rather than a sit-down meal.",
      },
      priceLevel: {
        type: "string",
        enum: ["budget", "moderate", "splurge"],
        description: "Rough cost tier to make the whole dish using US grocery prices.",
      },
      estimatedPriceUsd: {
        type: ["number", "null"],
        description: "Approximate total USD grocery cost to make the whole dish (not per serving).",
      },
      ingredients: {
        type: "array",
        items: {
          type: "object",
          properties: {
            item: { type: "string" },
            quantity: { type: ["string", "null"], description: "e.g. '2 cups', '1 lb', or null if unspecified." },
          },
          required: ["item", "quantity"],
        },
      },
      instructions: {
        type: "array",
        items: { type: "string" },
        description: "Ordered, numbered-in-order step-by-step instructions.",
      },
      tips: {
        type: "array",
        items: { type: "string" },
        description: "Optional short tips, substitutions, or serving suggestions mentioned.",
      },
      nutrition: {
        type: "object",
        description: "Estimated nutrition facts for a single serving of the finished dish.",
        properties: {
          caloriesPerServing: { type: ["number", "null"] },
          proteinGrams: { type: ["number", "null"] },
          carbsGrams: { type: ["number", "null"] },
          fatGrams: { type: ["number", "null"] },
          fiberGrams: { type: ["number", "null"] },
          sugarGrams: { type: ["number", "null"] },
          sodiumMg: { type: ["number", "null"], description: "Sodium in milligrams." },
        },
        required: [
          "caloriesPerServing",
          "proteinGrams",
          "carbsGrams",
          "fatGrams",
          "fiberGrams",
          "sugarGrams",
          "sodiumMg",
        ],
      },
      confidenceNotes: {
        type: ["string", "null"],
        description:
          "Note any assumptions made or gaps in the source video (e.g. no narration, quantities guessed).",
      },
      thumbnailFrameIndex: {
        type: ["integer", "null"],
        description:
          "0-based index (matching the 'Frame N' labels given with the images) of the sampled frame that " +
          "best works as a recipe card thumbnail: a clear, in-focus shot of the finished or near-finished " +
          "dish. Avoid blurry/motion-blurred frames, close-ups of hands or raw/unmixed ingredients, and " +
          "empty pans or backgrounds — prefer whichever frame looks most appetizing and least blurry even " +
          "if none are great. Null only if no frames were provided.",
      },
    },
    required: [
      "title",
      "servings",
      "totalTimeMinutes",
      "difficulty",
      "proteinType",
      "dietType",
      "mealType",
      "priceLevel",
      "estimatedPriceUsd",
      "ingredients",
      "instructions",
      "tips",
      "nutrition",
      "confidenceNotes",
      "thumbnailFrameIndex",
    ],
  },
};

const SYSTEM_PROMPT = `You are a culinary analyst for a recipe-saving app. Users save cooking videos from TikTok, and you turn each one into a structured, cookable recipe breakdown.

You will receive the video's caption/hashtags, an optional speech transcript, optional notes the user typed in by hand, and a handful of frames sampled evenly through the video. Read any on-screen text visible in the frames (ingredient lists, step captions, quantities) and combine it with the caption and transcript to reconstruct the recipe as completely and accurately as possible.

When information is missing or ambiguous, do not leave fields empty — use your general culinary knowledge to make a reasonable estimate (typical quantities, standard technique, usual cook time for that dish) and record any notable assumptions in confidenceNotes. Estimate total hands-on + cook/bake time in minutes, a difficulty rating for a home cook (easy/medium/hard), and an approximate total USD grocery cost to make the whole dish (not per serving) based on typical US grocery prices. Classify the single dominant protein and the overall diet category (vegan/vegetarian/pescatarian/omnivore), plus which meal it's typically for (breakfast/lunch/dinner/quick-bite — use quick-bite for snacks, small plates, or anything meant to be thrown together fast rather than a sit-down meal).

Also estimate nutrition facts for a single serving (divide the whole dish by the serving count you determined): calories, protein, carbs, fat, fiber, sugar (all in grams except calories), and sodium (in milligrams). Base this on standard nutritional values for the ingredients and quantities involved — reason like a nutrition-label estimate, not a guess pulled from thin air. Only use null for a nutrition field if the dish genuinely has none of it (e.g. fiberGrams could be 0, but don't null out a field just because you're unsure — estimate it).

Each frame is preceded by a "Frame N" label. Pick which one would make the best recipe card thumbnail and report its index as thumbnailFrameIndex — see that field's description for what makes a good pick.

Always respond by calling the submit_recipe_breakdown tool exactly once, with no other text.`;

export interface AnalyzeInput {
  sourceUrl: string;
  caption: string;
  transcript: string | null;
  userNotes: string | null;
  durationSeconds: number | null;
  framePaths: string[];
}

function truncate(text: string, max = 6000): string {
  return text.length > max ? `${text.slice(0, max)}\n…(truncated)` : text;
}

/**
 * Builds labeled "Frame N" + image content blocks for the frames that could be read, plus a
 * parallel array mapping each block's label index back to that frame's index in `framePaths` —
 * frames that fail to load are skipped, so the two can otherwise drift apart.
 */
async function buildImageBlocks(
  framePaths: string[],
): Promise<{ content: Anthropic.ContentBlockParam[]; sourceIndexes: number[] }> {
  const content: Anthropic.ContentBlockParam[] = [];
  const sourceIndexes: number[] = [];
  for (let i = 0; i < framePaths.length; i++) {
    try {
      const buf = await fs.readFile(framePaths[i]);
      content.push({ type: "text", text: `Frame ${sourceIndexes.length}:` });
      content.push({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: buf.toString("base64") },
      });
      sourceIndexes.push(i);
    } catch {
      // Skip frames that failed to extract; analysis proceeds with whatever we have.
    }
  }
  return { content, sourceIndexes };
}

export async function analyzeRecipe(input: AnalyzeInput): Promise<RecipeAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured. Set it in your environment to enable recipe analysis.",
    );
  }

  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const textParts = [
    `Source URL: ${input.sourceUrl}`,
    input.durationSeconds ? `Video duration: ~${Math.round(input.durationSeconds)} seconds` : null,
    `--- Caption / hashtags ---\n${truncate(input.caption || "(none provided)")}`,
    `--- Speech transcript ---\n${
      input.transcript ? truncate(input.transcript) : "(no spoken narration detected)"
    }`,
    input.userNotes ? `--- Notes typed in by the user ---\n${truncate(input.userNotes, 2000)}` : null,
  ].filter(Boolean);

  const { content: imageContent, sourceIndexes } = await buildImageBlocks(input.framePaths);

  const message = await client.messages.create({
    model,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [RECIPE_TOOL],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: textParts.join("\n\n") }, ...imageContent],
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("The recipe analysis model did not return a structured result.");
  }

  const parsed = toolResponseSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new Error(`Recipe analysis returned an unexpected shape: ${parsed.error.message}`);
  }

  const { thumbnailFrameIndex, ...analysis } = parsed.data;
  const sourceIndex =
    thumbnailFrameIndex !== null ? sourceIndexes[thumbnailFrameIndex] : undefined;
  const thumbnailFramePath = sourceIndex !== undefined ? input.framePaths[sourceIndex] : null;

  return { ...analysis, thumbnailFramePath };
}
