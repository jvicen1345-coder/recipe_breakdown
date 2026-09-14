// localStorage contract for RecipeChecklist's per-recipe cook-along checkmarks
// (ingredients/steps ticked off while actually cooking). Deliberately separate from
// the grocery list (see groceryListStorage.ts) — checking something off here means
// "I've got this while cooking," not "put this on my shopping list."

export function ingredientsStorageKey(recipeId: string): string {
  return `recipe-checklist:${recipeId}:ingredients`;
}

export function stepsStorageKey(recipeId: string): string {
  return `recipe-checklist:${recipeId}:steps`;
}

export function loadCheckedIndices(key: string): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export function saveCheckedIndices(key: string, indices: Set<number>) {
  try {
    localStorage.setItem(key, JSON.stringify([...indices]));
  } catch {
    // localStorage can throw in private-browsing contexts; state just won't persist.
  }
}
