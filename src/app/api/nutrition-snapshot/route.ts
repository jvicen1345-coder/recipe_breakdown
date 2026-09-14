import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { COMFORT_FOOD_KEYWORDS } from "@/lib/comfortFoodKeywords";
import { prisma } from "@/lib/prisma";
import type { Nutrition } from "@/lib/types";

const DAY_MS = 86_400_000;

function safeParseNutrition(json: string | null): Nutrition | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as Nutrition) : null;
  } catch {
    return null;
  }
}

function getWeekRange(weekOffset: number): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = (day + 6) % 7;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - diffToMonday + weekOffset * 7);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const url = new URL(request.url);
  const weekOffset = Number(url.searchParams.get("weekOffset") ?? "0") || 0;
  const { start, end } = getWeekRange(weekOffset);

  const logs = await prisma.cookLog.findMany({
    where: { cookedAt: { gte: start, lt: end } },
    include: { recipe: true },
    orderBy: { cookedAt: "asc" },
  });

  const daily = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d.toISOString().slice(0, 10), calories: 0 };
  });

  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const cookedRecipes = [];
  const cookedRecipeIds = new Set<string>();

  for (const log of logs) {
    const nutrition = safeParseNutrition(log.recipe.nutritionJson);
    const dayIndex = Math.floor((log.cookedAt.getTime() - start.getTime()) / DAY_MS);
    if (nutrition) {
      totals.calories += nutrition.caloriesPerServing ?? 0;
      totals.protein += nutrition.proteinGrams ?? 0;
      totals.carbs += nutrition.carbsGrams ?? 0;
      totals.fat += nutrition.fatGrams ?? 0;
      if (daily[dayIndex]) daily[dayIndex].calories += nutrition.caloriesPerServing ?? 0;
    }
    cookedRecipeIds.add(log.recipeId);
    cookedRecipes.push({
      logId: log.id,
      recipeId: log.recipeId,
      title: log.recipe.title,
      thumbnailUrl:
        log.recipe.thumbnailUrl ?? (log.recipe.thumbnailPath ? `/api/media/${log.recipe.thumbnailPath}` : null),
      cookedAt: log.cookedAt.toISOString(),
      rating: log.rating,
      caloriesPerServing: nutrition?.caloriesPerServing ?? null,
      orderedViaApp: log.recipe.lastOrderedViaAppAt != null,
    });
  }

  const macroCalories = totals.protein * 4 + totals.carbs * 4 + totals.fat * 9;
  const macroPct =
    macroCalories > 0
      ? {
          protein: Math.round(((totals.protein * 4) / macroCalories) * 100),
          carbs: Math.round(((totals.carbs * 4) / macroCalories) * 100),
          fat: Math.round(((totals.fat * 9) / macroCalories) * 100),
        }
      : { protein: 0, carbs: 0, fat: 0 };

  const avgDailyCalories = totals.calories / 7;
  const highCarb = logs.length > 0 && macroPct.carbs >= 50;
  const highProtein = logs.length > 0 && macroPct.protein >= 35;
  const lowCalorie = logs.length > 0 && avgDailyCalories < 350;

  let insight = "No cooking logged this week yet — mark a recipe as made to see your snapshot! 🌸";
  if (highCarb) insight = "High carb week 🍝 — a protein-forward save could help balance it out.";
  else if (highProtein) insight = "High protein week 💪 — nicely balanced, keep it up!";
  else if (lowCalorie) insight = "Lighter week 🥗 — maybe treat yourself to something cozy.";
  else if (logs.length > 0) insight = "Nicely balanced week ✨";

  let recommendations: { recipeId: string; title: string; thumbnailUrl: string | null; reason: string }[] = [];
  if (logs.length > 0) {
    const allRecipes = await prisma.recipe.findMany({
      where: { id: { notIn: [...cookedRecipeIds] } },
      orderBy: { createdAt: "desc" },
    });

    const scored: { recipeId: string; title: string; thumbnailUrl: string | null; reason: string }[] = [];
    for (const recipe of allRecipes) {
      const nutrition = safeParseNutrition(recipe.nutritionJson);
      const thumbnailUrl = recipe.thumbnailUrl ?? (recipe.thumbnailPath ? `/api/media/${recipe.thumbnailPath}` : null);
      if (highCarb && nutrition?.proteinGrams != null && nutrition.proteinGrams >= 20) {
        scored.push({ recipeId: recipe.id, title: recipe.title, thumbnailUrl, reason: "Balances your week 💪" });
      } else if (
        highProtein &&
        (nutrition?.caloriesPerServing == null || nutrition.caloriesPerServing <= 400 || recipe.dietType === "vegan" || recipe.dietType === "vegetarian")
      ) {
        scored.push({ recipeId: recipe.id, title: recipe.title, thumbnailUrl, reason: "A lighter pick to balance your week 🥗" });
      } else if (lowCalorie && COMFORT_FOOD_KEYWORDS.some((k) => recipe.title.toLowerCase().includes(k))) {
        scored.push({ recipeId: recipe.id, title: recipe.title, thumbnailUrl, reason: "A cozy treat to balance your week 🍰" });
      }
      if (scored.length >= 3) break;
    }
    recommendations = scored;
  }

  return NextResponse.json({
    weekOffset,
    weekStart: start.toISOString().slice(0, 10),
    weekEnd: new Date(end.getTime() - DAY_MS).toISOString().slice(0, 10),
    totals: {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
    },
    daily: daily.map((d) => ({ ...d, calories: Math.round(d.calories) })),
    macroPct,
    insight,
    cookedRecipes,
    recommendations,
  });
}
