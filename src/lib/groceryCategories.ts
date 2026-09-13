export type GroceryCategory = "produce" | "protein" | "dairy" | "pantry";

export const GROCERY_CATEGORY_ORDER: GroceryCategory[] = ["produce", "protein", "dairy", "pantry"];

export const GROCERY_CATEGORY_META: Record<GroceryCategory, { label: string; emoji: string }> = {
  produce: { label: "Produce", emoji: "🥦" },
  protein: { label: "Proteins", emoji: "🥩" },
  dairy: { label: "Dairy", emoji: "🧀" },
  pantry: { label: "Pantry", emoji: "🫙" },
};

const PRODUCE_KEYWORDS = [
  "onion", "garlic", "tomato", "potato", "carrot", "celery", "pepper", "lettuce", "spinach",
  "kale", "cucumber", "zucchini", "broccoli", "cauliflower", "mushroom", "avocado", "lemon",
  "lime", "apple", "banana", "berry", "strawberr", "blueberr", "raspberr", "basil", "cilantro",
  "parsley", "mint", "thyme", "rosemary", "dill", "scallion", "shallot", "ginger", "corn", "peas",
  "squash", "cabbage", "radish", "beet", "asparagus", "artichoke", "eggplant", "arugula", "chive",
  "jalapeno", "fruit", "vegetable", "herb", "mango", "pineapple", "grape", "orange", "peach",
];

const PROTEIN_KEYWORDS = [
  "chicken", "beef", "pork", "turkey", "salmon", "tuna", "shrimp", "prawn", "tofu", "tempeh",
  "egg", "sausage", "bacon", "steak", "lamb", "meat", "cod", "tilapia", "crab", "lobster",
  "chorizo", "ham", "pepperoni", "fish",
];

const DAIRY_KEYWORDS = [
  "milk", "cheese", "butter", "cream", "yogurt", "mozzarella", "parmesan", "feta", "cheddar",
  "ricotta", "buttermilk", "ghee",
];

/** Best-effort keyword match for grouping a shopping list — not exhaustive. */
export function categorizeIngredient(itemName: string): GroceryCategory {
  const lower = itemName.toLowerCase();
  if (PRODUCE_KEYWORDS.some((k) => lower.includes(k))) return "produce";
  if (PROTEIN_KEYWORDS.some((k) => lower.includes(k))) return "protein";
  if (DAIRY_KEYWORDS.some((k) => lower.includes(k))) return "dairy";
  return "pantry";
}
