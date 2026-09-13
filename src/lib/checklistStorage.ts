// Shared localStorage contract for per-recipe ingredient/step checkmarks, used by
// RecipeChecklist (the cook-along UI), RecipeCard's "Add to List" quick action, and
// the Grocery List page (which reads every recipe's checked ingredients).

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
