export interface PantryCategoryDef {
  key: string;
  label: string;
  emoji: string;
  items: string[];
}

// Shared by the onboarding tile picker and the full pantry page's grouping — the
// canonical set of starter staples plus the category a custom add falls back to.
export const PANTRY_CATEGORIES: PantryCategoryDef[] = [
  {
    key: "oils-vinegars",
    label: "Oils & Vinegars",
    emoji: "🫙",
    items: ["Olive oil", "Vegetable oil", "Balsamic vinegar", "Soy sauce"],
  },
  {
    key: "spices-seasonings",
    label: "Spices & Seasonings",
    emoji: "🌶️",
    items: ["Salt", "Pepper", "Garlic powder", "Paprika", "Cumin"],
  },
  {
    key: "grains-pasta",
    label: "Grains & Pasta",
    emoji: "🍝",
    items: ["Pasta", "Rice", "Breadcrumbs", "Flour", "Oats"],
  },
  {
    key: "dairy-eggs",
    label: "Dairy & Eggs",
    emoji: "🥛",
    items: ["Butter", "Milk", "Eggs", "Parmesan", "Heavy cream"],
  },
  {
    key: "canned-jarred",
    label: "Canned & Jarred",
    emoji: "🥫",
    items: ["Diced tomatoes", "Chicken stock", "Coconut milk", "Chickpeas"],
  },
  {
    key: "fresh-staples",
    label: "Fresh Staples",
    emoji: "🧄",
    items: ["Garlic", "Onion", "Lemon", "Fresh herbs"],
  },
];

export const OTHER_CATEGORY: PantryCategoryDef = { key: "other", label: "Other", emoji: "🧺", items: [] };

export const PANTRY_CATEGORY_LABELS: Record<string, { label: string; emoji: string }> = Object.fromEntries(
  [...PANTRY_CATEGORIES, OTHER_CATEGORY].map((c) => [c.key, { label: c.label, emoji: c.emoji }]),
);

/** Which onboarding category a given staple name belongs to, for tagging custom adds. */
export function categoryForItemName(name: string): string {
  const lower = name.trim().toLowerCase();
  for (const category of PANTRY_CATEGORIES) {
    if (category.items.some((item) => item.toLowerCase() === lower)) return category.key;
  }
  return OTHER_CATEGORY.key;
}
