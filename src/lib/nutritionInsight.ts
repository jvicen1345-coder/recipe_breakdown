// Shared between the full Week page (api/nutrition-snapshot) and the homepage's
// compact nutrition card (api/nutrition-home-card) so the same week's numbers
// always produce the same one-line insight, regardless of which surface renders it.
export function computeWeekInsight(
  macroPct: { protein: number; carbs: number; fat: number },
  avgDailyCalories: number,
  logsCount: number,
): string {
  const highCarb = logsCount > 0 && macroPct.carbs >= 50;
  const highProtein = logsCount > 0 && macroPct.protein >= 35;
  const lowCalorie = logsCount > 0 && avgDailyCalories < 350;

  if (highCarb) return "High carb week 🍝 — a protein-forward save could help balance it out.";
  if (highProtein) return "High protein week 💪 — nicely balanced, keep it up!";
  if (lowCalorie) return "Lighter week 🥗 — maybe treat yourself to something cozy.";
  if (logsCount > 0) return "Nicely balanced week ✨";
  return "No cooking logged this week yet — mark a recipe as made to see your snapshot! 🌸";
}
