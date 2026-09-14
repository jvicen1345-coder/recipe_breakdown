import { COMFORT_FOOD_KEYWORDS } from "@/lib/comfortFoodKeywords";
import type { RecipeDto } from "@/lib/types";

export const COOK_TONIGHT_FILTERS: { value: string; label: string }[] = [
  { value: "quick", label: "Quick (<30 min)" },
  { value: "budget", label: "Budget" },
  { value: "high-protein", label: "High Protein" },
  { value: "low-calorie", label: "Low Calorie" },
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "easy", label: "Easy" },
  { value: "comfort", label: "Comfort Food" },
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
    case "low-calorie":
      return recipe.nutrition?.caloriesPerServing != null && recipe.nutrition.caloriesPerServing <= 400;
    case "vegan":
      return recipe.dietType === "vegan";
    case "vegetarian":
      return recipe.dietType === "vegetarian";
    case "pescatarian":
      return recipe.dietType === "pescatarian";
    case "easy":
      return recipe.difficulty === "easy";
    case "comfort": {
      const title = recipe.title.toLowerCase();
      return COMFORT_FOOD_KEYWORDS.some((keyword) => title.includes(keyword));
    }
    default:
      return false;
  }
}
