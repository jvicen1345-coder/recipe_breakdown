// The grocery list is its own concept, independent of each recipe's cook-along
// checklist — adding a recipe to the grocery list (or clearing the list) must
// never touch the ingredient checkboxes a user ticks off while actually cooking.
// Items are stored as `${recipeId}:${ingredientIndex}` keys.

const GROCERY_ITEMS_KEY = "grocery-list-items";
const CROSSED_OFF_KEY = "grocery-crossed-off";

export function loadGroceryItemKeys(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(GROCERY_ITEMS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveGroceryItemKeys(keys: Set<string>) {
  try {
    localStorage.setItem(GROCERY_ITEMS_KEY, JSON.stringify([...keys]));
  } catch {
    // localStorage can throw in private-browsing contexts; the list just won't persist.
  }
}

/** Adds every ingredient of a recipe to the grocery list. */
export function addRecipeToGroceryList(recipeId: string, ingredientCount: number) {
  const keys = loadGroceryItemKeys();
  for (let i = 0; i < ingredientCount; i++) {
    keys.add(`${recipeId}:${i}`);
  }
  saveGroceryItemKeys(keys);
}

export function loadCrossedOff(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(CROSSED_OFF_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export function saveCrossedOff(ids: Set<string>) {
  try {
    localStorage.setItem(CROSSED_OFF_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage can throw in private-browsing contexts; crossed-off state just won't persist.
  }
}

/** Empties the grocery list entirely — items and crossed-off progress both. */
export function clearGroceryList() {
  try {
    localStorage.removeItem(GROCERY_ITEMS_KEY);
    localStorage.removeItem(CROSSED_OFF_KEY);
  } catch {
    // localStorage can throw in private-browsing contexts; nothing to clear then anyway.
  }
}
