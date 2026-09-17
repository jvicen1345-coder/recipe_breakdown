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
  mealType: string | null;
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
  // The owner — recipes are private (see prisma/schema.prisma), so every recipe in
  // a response already belongs to the caller. Kept on the DTO as a safety check for
  // client code (e.g. homeFeed.ts) rather than something that narrows visibility itself.
  userId: string;
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
  lastConfirmedAt: string;
}

export interface WeekMealEntry {
  id: string;
  kind: "recipe" | "manual";
  recipeId: string | null;
  title: string;
  thumbnailUrl: string | null;
  loggedAt: string;
  rating: number | null;
  caloriesPerServing: number | null;
  proteinGrams: number | null;
  carbsGrams: number | null;
  fatGrams: number | null;
  orderedViaApp: boolean;
}

export interface NutritionSnapshot {
  weekOffset: number;
  weekStart: string;
  weekEnd: string;
  streakDays: number;
  totals: { calories: number; protein: number; carbs: number; fat: number };
  goals: { calories: number; protein: number; carbs: number; fat: number };
  daily: { date: string; calories: number }[];
  macroPct: { protein: number; carbs: number; fat: number };
  insight: string | null;
  meals: WeekMealEntry[];
  recommendations: {
    recipeId: string;
    title: string;
    thumbnailUrl: string | null;
    reason: string;
    badge: "high-protein" | "light";
  }[];
}

// Powers only the homepage "This Week" card (src/app/api/nutrition-home-card) — kept
// separate from NutritionSnapshot (the full /nutrition Week tab) so tweaking the
// homepage card can never change what the Week tab shows.
export interface HomeNutritionCard {
  hasCookedThisWeek: boolean;
  weekMacroPct: { protein: number; carbs: number; fat: number };
  totals: { calories: number; protein: number; carbs: number; fat: number };
  dayMarks: { date: string; label: string; cooked: boolean; isToday: boolean }[];
  streakDays: number;
  recommendation: { recipeId: string; title: string; thumbnailUrl: string | null; reason: string } | null;
  message: string;
  insight: string;
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
    mealType: recipe.mealType,
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
    userId: recipe.userId,
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
  lastConfirmedAt: Date;
}): PantryItemDto {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    createdAt: item.createdAt.toISOString(),
    lastConfirmedAt: item.lastConfirmedAt.toISOString(),
  };
}
