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

// Deliberately omits the Recipe model's `caption`/`transcript` columns — they're only
// ever read by the analysis pipeline (see analyze.ts), never rendered in the UI, and
// can be large (full video captions/speech transcripts), so keeping them off this
// client-facing DTO measurably shrinks every page load and the "Break it down" response.
export interface RecipeDto {
  id: string;
  sourceUrl: string;
  title: string;
  authorHandle: string | null;
  thumbnailUrl: string | null;
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
  personalNotes: string | null;
  folderId: string | null;
  createdAt: string;
}

export interface FolderDto {
  id: string;
  name: string;
  emoji: string | null;
  createdAt: string;
}

export interface PantryItemDto {
  id: string;
  name: string;
  category: string;
  createdAt: string;
}

export interface NutritionSnapshot {
  weekOffset: number;
  weekStart: string;
  weekEnd: string;
  totals: { calories: number; protein: number; carbs: number; fat: number };
  daily: { date: string; calories: number }[];
  macroPct: { protein: number; carbs: number; fat: number };
  insight: string;
  cookedRecipes: {
    logId: string;
    recipeId: string;
    title: string;
    thumbnailUrl: string | null;
    cookedAt: string;
    rating: number | null;
    caloriesPerServing: number | null;
  }[];
  recommendations: { recipeId: string; title: string; thumbnailUrl: string | null; reason: string }[];
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
    personalNotes: recipe.personalNotes,
    folderId: recipe.folderId,
    createdAt: recipe.createdAt.toISOString(),
  };
}

export function toFolderDto(folder: { id: string; name: string; emoji: string | null; createdAt: Date }): FolderDto {
  return {
    id: folder.id,
    name: folder.name,
    emoji: folder.emoji,
    createdAt: folder.createdAt.toISOString(),
  };
}

export function toPantryItemDto(item: {
  id: string;
  name: string;
  category: string;
  createdAt: Date;
}): PantryItemDto {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    createdAt: item.createdAt.toISOString(),
  };
}
