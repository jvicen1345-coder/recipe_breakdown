// Fuzzy matching between pantry staple names ("garlic") and full recipe ingredient
// text ("garlic cloves, minced") — a plain two-way substring check on normalized
// text, forgiving enough to handle plurals/qualifiers without a real NLP lookup.

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ingredientInPantry(ingredientItem: string, pantryNames: string[]): boolean {
  const ing = normalize(ingredientItem);
  if (!ing) return false;
  return pantryNames.some((name) => {
    const p = normalize(name);
    return p.length > 0 && (ing.includes(p) || p.includes(ing));
  });
}

export function pantryMatchCount(
  ingredients: { item: string }[],
  pantryNames: string[],
): { have: number; total: number } {
  const total = ingredients.length;
  const have = ingredients.filter((ing) => ingredientInPantry(ing.item, pantryNames)).length;
  return { have, total };
}
