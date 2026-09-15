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

export function getGreeting(name?: string | null): string {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = name?.trim().split(/\s+/)[0];
  return firstName ? `${timeOfDay}, ${firstName}!` : `${timeOfDay}!`;
}

export function getTodayCardPrompt(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "What are you making for dinner tonight? 🌙";
  if (hour < 20) return "Still deciding on dinner? 🍽️";
  return "Saving something for tomorrow? ✨";
}

/** Uncooked recipe featured on the "today card" — rotates daily instead of on every reload. */
export function pickTodayCardRecipe(saved: RecipeDto[]): RecipeDto | null {
  const cooked = getCookedTimestamps();
  const uncooked = saved.filter((r) => !(r.id in cooked));
  if (uncooked.length === 0) return null;
  const dayKey = new Date().toISOString().slice(0, 10);
  return uncooked[stringHash(dayKey) % uncooked.length];
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
