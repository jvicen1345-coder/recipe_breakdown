// Pure helpers behind the "For You" homepage feed. Personalization here is scoped
// to recipes THIS signed-in user personally saved (createdByUserId) — the shared
// library stays fully visible everywhere else, this only decides what the feed
// highlights. "Cooked" status uses the same per-browser localStorage timestamps
// the Cook Tonight swiper already relies on (see clientState.ts), not the shared
// CookLog table, so it's consistent with existing recency logic elsewhere.
import { getCookedTimestamps, getFavoriteIds } from "./clientState";
import { PROTEIN_LABELS } from "./format";
import type { RecipeDto } from "./types";

export function mySavedRecipes(recipes: RecipeDto[], currentUserId: string | null): RecipeDto[] {
  if (!currentUserId) return [];
  return recipes.filter((r) => r.createdByUserId === currentUserId);
}

function stringHash(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Most recently saved recipe. */
export function pickRecentlyAdded(saved: RecipeDto[]): RecipeDto | null {
  if (saved.length === 0) return null;
  return [...saved].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
}

/** The single saved recipe that's gone longest without a repeat cook (14+ days). */
export function pickMostOverdueRecipe(saved: RecipeDto[], minDays = 14): RecipeDto | null {
  const cooked = getCookedTimestamps();
  const now = Date.now();
  const stale = saved
    .filter((r) => {
      const ts = cooked[r.id];
      if (!ts) return false;
      return (now - new Date(ts).getTime()) / 86_400_000 >= minDays;
    })
    .sort((a, b) => new Date(cooked[a.id]).getTime() - new Date(cooked[b.id]).getTime());
  return stale[0] ?? null;
}

/** Maps the current hour to a recipe mealType, mirroring how people actually eat. */
export function getCurrentMealType(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 15) return "lunch";
  if (hour < 21) return "dinner";
  return "quick-bite";
}

export interface MealTimeInsight {
  mealType: string;
  recipe: RecipeDto;
}

/** A saved recipe matching the current meal time — rotates daily, falls back to any saved pick. */
export function pickMealTimeRecipe(saved: RecipeDto[]): MealTimeInsight | null {
  if (saved.length === 0) return null;
  const cooked = getCookedTimestamps();
  const uncooked = saved.filter((r) => !(r.id in cooked));
  const pool = uncooked.length > 0 ? uncooked : saved;
  const mealType = getCurrentMealType();
  const matches = pool.filter((r) => r.mealType === mealType);
  const list = matches.length > 0 ? matches : pool;
  const dayKey = new Date().toISOString().slice(0, 10);
  const recipe = list[stringHash(dayKey + mealType) % list.length];
  return { mealType, recipe };
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
