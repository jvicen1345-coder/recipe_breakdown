// Small, purely-cosmetic per-browser state (recently viewed recipes, "I made this!"
// marks) that doesn't need to survive a cleared browser or sync across devices —
// same tradeoff as favorites, kept in localStorage rather than the database.

const RECENTLY_VIEWED_KEY = "recipe-recently-viewed";
const RECENTLY_VIEWED_MAX = 8;

export function getRecentlyViewedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function recordRecipeViewed(recipeId: string) {
  try {
    const current = getRecentlyViewedIds().filter((id) => id !== recipeId);
    const next = [recipeId, ...current].slice(0, RECENTLY_VIEWED_MAX);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  } catch {
    // localStorage can throw in private-browsing contexts; recently-viewed just won't persist.
  }
}

const COOKED_KEY = "recipe-cooked";

function loadCookedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(COOKED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export function isMarkedCooked(recipeId: string): boolean {
  return loadCookedIds().has(recipeId);
}

export function markCooked(recipeId: string) {
  try {
    const ids = loadCookedIds();
    ids.add(recipeId);
    localStorage.setItem(COOKED_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage can throw in private-browsing contexts; the mark just won't persist.
  }
}
