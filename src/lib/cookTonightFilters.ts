import { COMFORT_FOOD_KEYWORDS } from "@/lib/comfortFoodKeywords";
import type { RecipeDto } from "@/lib/types";

// The homepage "Cook Tonight?" section's filter pills.
export const COOK_TONIGHT_FILTERS: { value: string; label: string }[] = [
  { value: "quick", label: "Quick" },
  { value: "budget", label: "Budget" },
  { value: "high-protein", label: "High Protein" },
  { value: "vegan", label: "Vegan" },
  { value: "comfort", label: "Comfort Food" },
];

// The My Recipes tab's filter pills — a slightly different set/order, sharing the
// same matcher below plus an "all" reset value that isn't a real filter.
export const MY_RECIPES_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "quick", label: "Quick" },
  { value: "budget", label: "Budget" },
  { value: "vegan", label: "Vegan" },
  { value: "high-protein", label: "High Protein" },
];

export const COOK_TONIGHT_FILTER_LABELS: Record<string, string> = Object.fromEntries(
  COOK_TONIGHT_FILTERS.map((f) => [f.value, f.label]),
);

export function matchesCookTonightFilter(recipe: RecipeDto, filter: string): boolean {
  switch (filter) {
    case "quick":
      return recipe.totalTimeMinutes != null && recipe.totalTimeMinutes < 30;
    case "budget":
      return recipe.priceLevel === "budget";
    case "high-protein":
      return (recipe.nutrition?.proteinGrams ?? 0) >= 20;
    case "vegan":
      return recipe.dietType === "vegan";
    case "comfort": {
      const title = recipe.title.toLowerCase();
      return COMFORT_FOOD_KEYWORDS.some((keyword) => title.includes(keyword));
    }
    default:
      return false;
  }
}
