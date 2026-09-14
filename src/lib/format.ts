export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

// Badges are colored by category, not by value — every difficulty is soft pink,
// every price tier is mint, etc. — per the pastel "That Girl" design system.
export const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-blush text-rose-deep",
  medium: "bg-blush text-rose-deep",
  hard: "bg-blush text-rose-deep",
};

export const PRICE_LABELS: Record<string, string> = {
  budget: "Budget-friendly",
  moderate: "Moderate",
  splurge: "Splurge",
};

export const PRICE_STYLES: Record<string, string> = {
  budget: "bg-mint text-mint-dark",
  moderate: "bg-mint text-mint-dark",
  splurge: "bg-mint text-mint-dark",
};

export const DIET_LABELS: Record<string, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  pescatarian: "Pescatarian",
  omnivore: "Omnivore",
};

export const DIET_STYLES: Record<string, string> = {
  vegan: "bg-peach text-peach-dark",
  vegetarian: "bg-peach text-peach-dark",
  pescatarian: "bg-peach text-peach-dark",
  omnivore: "bg-peach text-peach-dark",
};

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  "quick-bite": "Quick Bite",
};

export const MEAL_TYPE_STYLES: Record<string, string> = {
  breakfast: "bg-sage text-sage-dark",
  lunch: "bg-sage text-sage-dark",
  dinner: "bg-sage text-sage-dark",
  "quick-bite": "bg-sage text-sage-dark",
};

export const TIME_BADGE_STYLE = "bg-lavender text-lavender-dark";

export const PROTEIN_LABELS: Record<string, string> = {
  chicken: "Chicken",
  beef: "Beef",
  pork: "Pork",
  seafood: "Seafood",
  egg: "Egg",
  "plant-based": "Plant-based",
  other: "Other protein",
  none: "No protein",
};

export function formatMinutes(minutes: number | null): string {
  if (!minutes) return "Unknown";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function formatPriceUsd(price: number | null): string | null {
  if (price == null) return null;
  return `~$${price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}`;
}
