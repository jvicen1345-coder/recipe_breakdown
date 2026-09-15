// Pure helpers behind the "For You" homepage feed. Every recipe passed in already
// belongs to the signed-in user (recipes are private, see prisma/schema.prisma), so
// mySavedRecipes is just a defensive filter rather than what narrows visibility.
// "Cooked" status uses the same per-browser localStorage timestamps the Cook
// Tonight swiper already relies on (see clientState.ts), not the CookLog table, so
// it's consistent with existing recency logic elsewhere.
import { getCookedTimestamps, getFavoriteIds, getViewedTimestamps } from "./clientState";
import { matchesCookTonightFilter } from "./cookTonightFilters";
import { PROTEIN_LABELS } from "./format";
import type { RecipeDto } from "./types";

export function mySavedRecipes(recipes: RecipeDto[], currentUserId: string | null): RecipeDto[] {
  if (!currentUserId) return [];
  return recipes.filter((r) => r.userId === currentUserId);
}

function stringHash(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export function getGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName ? `${timeOfDay}, ${firstName}!` : `${timeOfDay}!`;
}

/** Most recently saved recipe. */
export function pickRecentlyAdded(saved: RecipeDto[]): RecipeDto | null {
  if (saved.length === 0) return null;
  return [...saved].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

/**
 * The saved recipe (other than `excludeId`) that's gone longest without a repeat
 * cook — never-cooked recipes count as "most overdue" and sort first. Returns null
 * if every remaining candidate was cooked within the last 7 days (nothing's overdue).
 */
export function pickOverdueOrNeverCooked(saved: RecipeDto[], excludeId: string | null): RecipeDto | null {
  const cooked = getCookedTimestamps();
  const pool = saved.filter((r) => r.id !== excludeId);
  if (pool.length === 0) return null;

  const ranked = pool
    .map((recipe) => ({ recipe, cookedAt: cooked[recipe.id] ? new Date(cooked[recipe.id]).getTime() : null }))
    .sort((a, b) => {
      if (a.cookedAt === null && b.cookedAt === null) return 0;
      if (a.cookedAt === null) return -1;
      if (b.cookedAt === null) return 1;
      return a.cookedAt - b.cookedAt;
    });

  const top = ranked[0];
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  if (top.cookedAt !== null && top.cookedAt >= sevenDaysAgo) return null;
  return top.recipe;
}

export type TimeBand = "breakfast" | "lunch" | "dinner" | "latenight";

export const TIME_BAND_PILL_LABEL: Record<TimeBand, string> = {
  breakfast: "Quick breakfast save ☀️",
  lunch: "Lunch idea 🥗",
  dinner: "Dinner tonight? 🌙",
  latenight: "Late night cook 🌙",
};

/** Shown on the ghost placeholder in this slot when no saved recipe matches the current time band. */
export const TIME_BAND_GHOST_HINT: Record<TimeBand, string> = {
  breakfast: "Save a quick breakfast-y save (under 20 min) and a cute morning pick will bloom here ☀️",
  lunch: "Save a lunchtime fave (20–45 min) and a sweet midday pick will show up here 🥗",
  dinner: "Save something new and I'll pick out tonight's dinner for you 🌙",
  latenight: "Save a cozy or speedy recipe for a little late-night treat pick 🌙",
};

export function getTimeBand(): TimeBand {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 14) return "lunch";
  if (hour < 18) return "dinner";
  return "latenight";
}

function matchesTimeBand(recipe: RecipeDto, band: TimeBand, cooked: Record<string, string>): boolean {
  switch (band) {
    case "breakfast":
      return recipe.totalTimeMinutes != null && recipe.totalTimeMinutes < 20;
    case "lunch":
      return recipe.totalTimeMinutes != null && recipe.totalTimeMinutes >= 20 && recipe.totalTimeMinutes <= 45;
    case "dinner":
      return !(recipe.id in cooked);
    case "latenight":
      return (
        (recipe.totalTimeMinutes != null && recipe.totalTimeMinutes < 20) ||
        matchesCookTonightFilter(recipe, "comfort")
      );
  }
}

export interface TimeBasedPick {
  band: TimeBand;
  recipe: RecipeDto;
}

/** The best saved match for the current time-of-day window, excluding already-used recipes. */
export function pickTimeBasedRecipe(saved: RecipeDto[], excludeIds: (string | null | undefined)[]): TimeBasedPick | null {
  const band = getTimeBand();
  const cooked = getCookedTimestamps();
  const excluded = new Set(excludeIds.filter((id): id is string => id != null));
  const pool = saved.filter((r) => !excluded.has(r.id) && matchesTimeBand(r, band, cooked));
  if (pool.length === 0) return null;
  const dayKey = new Date().toISOString().slice(0, 10);
  return { band, recipe: pool[stringHash(dayKey + band) % pool.length] };
}

export type MacroBucket = "high-carb" | "high-calorie" | "low-protein" | "low-calorie" | "no-data";

export const MACRO_PILL_LABEL: Record<MacroBucket, string> = {
  "high-carb": "Protein boost 💪",
  "high-calorie": "Keep it light 🥗",
  "low-protein": "Fuel up 🔥",
  "low-calorie": "Treat yourself 🍝",
  "no-data": "Try something new ✨",
};

/** Shown on the ghost placeholder in this slot when no saved recipe matches this week's macro bucket. */
export const MACRO_GHOST_HINT: Record<MacroBucket, string> = {
  "high-carb": "Save a protein-packed recipe (with nutrition info) and I'll cheer you on here 💪",
  "low-protein": "Save a protein-packed recipe (with nutrition info) and I'll cheer you on here 💪",
  "high-calorie": "Save a lighter save (with nutrition info) and a fresh little pick will bloom here 🥗",
  "low-calorie": "Save a cozy comfort-food fave for a sweet treat pick here 🍝",
  "no-data": "Save one more recipe and a little surprise pick will pop up here ✨",
};

/** Shown on Card 2's ghost placeholder — the reason differs depending on why it's empty. */
export function getOverdueGhostHint(savedCount: number): string {
  if (savedCount < 2) return "Save 1 more recipe and a comeback pick will show up here 👀";
  return "You've been on such a roll, bestie — nothing's due for a comeback yet 💕";
}

/** Categorizes this week's cooking data into the macro bucket the homepage macro card responds to. */
export function pickMacroBucket(
  weekMacroPct: { protein: number; carbs: number; fat: number },
  avgDailyCalories: number,
  hasCookedThisWeek: boolean,
): MacroBucket {
  if (!hasCookedThisWeek) return "no-data";
  if (weekMacroPct.carbs >= 50) return "high-carb";
  if (avgDailyCalories >= 2200) return "high-calorie";
  if (weekMacroPct.protein < 15) return "low-protein";
  if (avgDailyCalories < 350) return "low-calorie";
  return "no-data";
}

/** Picks the saved recipe (from the remaining candidates) that best answers this week's macro bucket. */
export function pickMacroRecipe(candidates: RecipeDto[], bucket: MacroBucket): RecipeDto | null {
  if (candidates.length === 0) return null;

  if (bucket === "high-carb" || bucket === "low-protein") {
    const withProtein = candidates.filter((r) => r.nutrition?.proteinGrams != null);
    if (withProtein.length === 0) return null;
    return [...withProtein].sort((a, b) => b.nutrition!.proteinGrams! - a.nutrition!.proteinGrams!)[0];
  }

  if (bucket === "high-calorie") {
    const withCalories = candidates.filter((r) => r.nutrition?.caloriesPerServing != null);
    if (withCalories.length === 0) return null;
    return [...withCalories].sort((a, b) => a.nutrition!.caloriesPerServing! - b.nutrition!.caloriesPerServing!)[0];
  }

  if (bucket === "low-calorie") {
    const comfort = candidates.filter((r) => matchesCookTonightFilter(r, "comfort"));
    if (comfort.length > 0) return comfort[0];
    const withCalories = candidates.filter((r) => r.nutrition?.caloriesPerServing != null);
    if (withCalories.length === 0) return null;
    return [...withCalories].sort((a, b) => b.nutrition!.caloriesPerServing! - a.nutrition!.caloriesPerServing!)[0];
  }

  // "no-data" — least recently viewed save (never-viewed counts as longest overdue).
  const viewed = getViewedTimestamps();
  return [...candidates].sort((a, b) => {
    const aViewed = viewed[a.id] ? new Date(viewed[a.id]).getTime() : -Infinity;
    const bViewed = viewed[b.id] ? new Date(viewed[b.id]).getTime() : -Infinity;
    return aViewed - bViewed;
  })[0];
}

export interface ProteinTagInsight {
  label: string;
  emoji: string;
  recipes: RecipeDto[];
}

const PROTEIN_EMOJI: Record<string, string> = {
  chicken: "🍗",
  beef: "🥩",
  pork: "🥓",
  seafood: "🦐",
  egg: "🥚",
  "plant-based": "🌱",
  other: "🍽️",
};

/** The most common protein tag among saved recipes, and the uncooked saves that carry it. */
export function pickTopProteinTag(saved: RecipeDto[]): ProteinTagInsight | null {
  if (saved.length < 3) return null;
  const counts = new Map<string, number>();
  for (const r of saved) {
    if (!r.proteinType || r.proteinType === "none") continue;
    counts.set(r.proteinType, (counts.get(r.proteinType) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  const [tag] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const cooked = getCookedTimestamps();
  const recipes = saved.filter((r) => r.proteinType === tag && !(r.id in cooked));
  if (recipes.length === 0) return null;
  return { label: PROTEIN_LABELS[tag] ?? tag, emoji: PROTEIN_EMOJI[tag] ?? "🍽️", recipes };
}

/** Saved recipes last cooked 14+ days ago (per this browser's cook history). */
export function pickStaleRecipes(saved: RecipeDto[], minDays = 14): RecipeDto[] {
  const cooked = getCookedTimestamps();
  const now = Date.now();
  return saved.filter((r) => {
    const ts = cooked[r.id];
    if (!ts) return false;
    return (now - new Date(ts).getTime()) / 86_400_000 >= minDays;
  });
}

export function pickFavoriteRecipes(recipes: RecipeDto[]): RecipeDto[] {
  const favIds = getFavoriteIds();
  return recipes.filter((r) => favIds.has(r.id));
}
