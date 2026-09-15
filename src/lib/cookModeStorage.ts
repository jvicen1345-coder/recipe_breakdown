// Remembers which step a recipe's Cook Mode was left on, so exiting mid-recipe
// can resume later instead of always restarting at step 1. Saving only happens
// when the user confirms exit with the "save my spot" switch on — it's not a
// continuous autosave, so the switch stays a meaningful, deliberate choice.

const COOK_PROGRESS_KEY = "cook-mode-progress";

interface ProgressEntry {
  stepIndex: number;
  updatedAt: string;
}

function loadAll(): Record<string, ProgressEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(COOK_PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    // Back-compat: older entries stored a bare number instead of {stepIndex, updatedAt}.
    const normalized: Record<string, ProgressEntry> = {};
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "number") {
        normalized[id] = { stepIndex: value, updatedAt: new Date(0).toISOString() };
      } else if (value && typeof value === "object" && typeof (value as ProgressEntry).stepIndex === "number") {
        normalized[id] = value as ProgressEntry;
      }
    }
    return normalized;
  } catch {
    return {};
  }
}

function saveAll(map: Record<string, ProgressEntry>) {
  try {
    localStorage.setItem(COOK_PROGRESS_KEY, JSON.stringify(map));
  } catch {
    // localStorage can throw in private-browsing contexts; progress just won't persist.
  }
}

export function getCookModeProgress(recipeId: string): number | null {
  const all = loadAll();
  return recipeId in all ? all[recipeId].stepIndex : null;
}

export function saveCookModeProgress(recipeId: string, stepIndex: number) {
  const all = loadAll();
  all[recipeId] = { stepIndex, updatedAt: new Date().toISOString() };
  saveAll(all);
}

export function clearCookModeProgress(recipeId: string) {
  const all = loadAll();
  delete all[recipeId];
  saveAll(all);
}

/** The most recently left-off in-progress recipe across all saved progress, if any. */
export function getMostRecentCookProgress(): { recipeId: string; stepIndex: number } | null {
  const all = loadAll();
  const entries = Object.entries(all);
  if (entries.length === 0) return null;
  entries.sort((a, b) => new Date(b[1].updatedAt).getTime() - new Date(a[1].updatedAt).getTime());
  const [recipeId, entry] = entries[0];
  return { recipeId, stepIndex: entry.stepIndex };
}
