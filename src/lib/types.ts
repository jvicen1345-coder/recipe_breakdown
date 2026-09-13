import type { Recipe } from "@/generated/prisma/client";

export interface Ingredient {
  item: string;
  quantity: string | null;
}

export interface Nutrition {
  caloriesPerServing: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  fiberGrams: number | null;
  sugarGrams: number | null;
  sodiumMg: number | null;
}

export interface RecipeDto {
  id: string;
  sourceUrl: string;
  title: string;
  authorHandle: string | null;
  thumbnailUrl: string | null;
  caption: string | null;
  transcript: string | null;
  userNotes: string | null;
  durationSeconds: number | null;
  servings: number | null;
  totalTimeMinutes: number | null;
  difficulty: string | null;
  proteinType: string | null;
  dietType: string | null;
  priceLevel: string | null;
  estimatedPriceUsd: number | null;
  ingredients: Ingredient[];
  instructions: string[];
  tips: string[];
  nutrition: Nutrition | null;
  confidenceNotes: string | null;
  createdAt: string;
}

function safeParseArray<T>(json: string | null): T[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeParseObject<T>(json: string | null): T | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as T) : null;
  } catch {
    return null;
  }
}

export function toRecipeDto(recipe: Recipe): RecipeDto {
  return {
    id: recipe.id,
    sourceUrl: recipe.sourceUrl,
    title: recipe.title,
    authorHandle: recipe.authorHandle,
    thumbnailUrl: recipe.thumbnailUrl ?? (recipe.thumbnailPath ? `/api/media/${recipe.thumbnailPath}` : null),
    caption: recipe.caption,
    transcript: recipe.transcript,
    userNotes: recipe.userNotes,
    durationSeconds: recipe.durationSeconds,
    servings: recipe.servings,
    totalTimeMinutes: recipe.totalTimeMinutes,
    difficulty: recipe.difficulty,
    proteinType: recipe.proteinType,
    dietType: recipe.dietType,
    priceLevel: recipe.priceLevel,
    estimatedPriceUsd: recipe.estimatedPriceUsd,
    ingredients: safeParseArray<Ingredient>(recipe.ingredientsJson),
    instructions: safeParseArray<string>(recipe.instructionsJson),
    tips: safeParseArray<string>(recipe.tipsJson),
    nutrition: safeParseObject<Nutrition>(recipe.nutritionJson),
    confidenceNotes: recipe.confidenceNotes,
    createdAt: recipe.createdAt.toISOString(),
  };
}
