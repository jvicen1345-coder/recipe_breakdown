// Remembers which step a recipe's Cook Mode was left on, so exiting mid-recipe
// can resume later instead of always restarting at step 1. Saving only happens
// when the user confirms exit with the "save my spot" switch on — it's not a
// continuous autosave, so the switch stays a meaningful, deliberate choice.

const COOK_PROGRESS_KEY = "cook-mode-progress";

function loadAll(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(COOK_PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveAll(map: Record<string, number>) {
  try {
    localStorage.setItem(COOK_PROGRESS_KEY, JSON.stringify(map));
  } catch {
    // localStorage can throw in private-browsing contexts; progress just won't persist.
  }
}

export function getCookModeProgress(recipeId: string): number | null {
  const all = loadAll();
  return recipeId in all ? all[recipeId] : null;
}

export function saveCookModeProgress(recipeId: string, stepIndex: number) {
  const all = loadAll();
  all[recipeId] = stepIndex;
  saveAll(all);
}

export function clearCookModeProgress(recipeId: string) {
  const all = loadAll();
  delete all[recipeId];
  saveAll(all);
}
