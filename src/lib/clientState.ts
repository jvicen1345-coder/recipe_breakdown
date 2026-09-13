// Small, purely-cosmetic per-browser state (recently viewed recipes, favorites,
// "I made this!" marks) that doesn't need to survive a cleared browser or sync
// across devices — kept in localStorage rather than the database.

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

const FAVORITES_KEY = "recipe-favorites";

export function getFavoriteIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

/** Toggles a recipe's favorite state and returns the new state. */
export function toggleFavorite(recipeId: string): boolean {
  const favorites = getFavoriteIds();
  const next = !favorites.has(recipeId);
  if (next) favorites.add(recipeId);
  else favorites.delete(recipeId);
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]));
  } catch {
    // localStorage can throw in private-browsing contexts; favorite just won't persist.
  }
  return next;
}

// Maps recipe id -> ISO timestamp of the most recent "I made this!" click, so we
// can tell not just whether a recipe has been cooked but how long ago.
const COOKED_KEY = "recipe-cooked";

function loadCookedTimestamps(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(COOKED_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function getAllCookedTimestamps(): Record<string, string> {
  return loadCookedTimestamps();
}

export function isMarkedCooked(recipeId: string): boolean {
  return recipeId in loadCookedTimestamps();
}

export function markCooked(recipeId: string) {
  try {
    const timestamps = loadCookedTimestamps();
    timestamps[recipeId] = new Date().toISOString();
    localStorage.setItem(COOKED_KEY, JSON.stringify(timestamps));
  } catch {
    // localStorage can throw in private-browsing contexts; the mark just won't persist.
  }
}
