export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export const DIFFICULTY_STYLES: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  hard: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

export const PRICE_LABELS: Record<string, string> = {
  budget: "Budget-friendly",
  moderate: "Moderate",
  splurge: "Splurge",
};

export const PRICE_STYLES: Record<string, string> = {
  budget: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  moderate: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  splurge: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
};

export const DIET_LABELS: Record<string, string> = {
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  pescatarian: "Pescatarian",
  omnivore: "Omnivore",
};

export const DIET_STYLES: Record<string, string> = {
  vegan: "bg-lime-100 text-lime-800 dark:bg-lime-900/40 dark:text-lime-300",
  vegetarian: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  pescatarian: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300",
  omnivore: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

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
