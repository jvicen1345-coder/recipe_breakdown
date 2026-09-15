import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { COMFORT_FOOD_KEYWORDS } from "@/lib/comfortFoodKeywords";
import { computeWeekTabInsight } from "@/lib/nutritionInsight";
import { resolveGoals } from "@/lib/nutritionGoals";
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

  const today = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const streakWindowStart = new Date(today);
  streakWindowStart.setDate(today.getDate() - 90);

  const [logs, manualLogs, user, streakWindowLogs] = await Promise.all([
    prisma.cookLog.findMany({
      where: { cookedAt: { gte: start, lt: end } },
      include: { recipe: true },
      orderBy: { cookedAt: "asc" },
    }),
    prisma.manualMealLog.findMany({
      where: { loggedAt: { gte: start, lt: end } },
      orderBy: { loggedAt: "asc" },
    }),
    prisma.user.findUnique({ where: { id: userId } }),
    // Always "today's actual streak," independent of which week is being browsed.
    prisma.cookLog.findMany({ where: { cookedAt: { gte: streakWindowStart, lt: tomorrow } }, select: { cookedAt: true } }),
  ]);

  const cookedDateKeys = new Set(streakWindowLogs.map((log) => log.cookedAt.toISOString().slice(0, 10)));
  let streakDays = 0;
  const cursor = new Date(today);
  if (!cookedDateKeys.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  while (cookedDateKeys.has(cursor.toISOString().slice(0, 10))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const daily = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { date: d.toISOString().slice(0, 10), calories: 0 };
  });

  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const cookedRecipeIds = new Set<string>();

  interface MealEntry {
    id: string;
    kind: "recipe" | "manual";
    recipeId: string | null;
    title: string;
    thumbnailUrl: string | null;
    loggedAt: string;
    rating: number | null;
    caloriesPerServing: number | null;
    proteinGrams: number | null;
    carbsGrams: number | null;
    fatGrams: number | null;
    orderedViaApp: boolean;
  }
  const meals: MealEntry[] = [];

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
    meals.push({
      id: log.id,
      kind: "recipe",
      recipeId: log.recipeId,
      title: log.recipe.title,
      thumbnailUrl:
        log.recipe.thumbnailUrl ?? (log.recipe.thumbnailPath ? `/api/media/${log.recipe.thumbnailPath}` : null),
      loggedAt: log.cookedAt.toISOString(),
      rating: log.rating,
      caloriesPerServing: nutrition?.caloriesPerServing ?? null,
      proteinGrams: nutrition?.proteinGrams ?? null,
      carbsGrams: nutrition?.carbsGrams ?? null,
      fatGrams: nutrition?.fatGrams ?? null,
      orderedViaApp: log.recipe.lastOrderedViaAppAt != null,
    });
  }

  for (const manual of manualLogs) {
    const dayIndex = Math.floor((manual.loggedAt.getTime() - start.getTime()) / DAY_MS);
    totals.calories += manual.caloriesPerServing ?? 0;
    totals.protein += manual.proteinGrams ?? 0;
    totals.carbs += manual.carbsGrams ?? 0;
    totals.fat += manual.fatGrams ?? 0;
    if (daily[dayIndex]) daily[dayIndex].calories += manual.caloriesPerServing ?? 0;
    meals.push({
      id: manual.id,
      kind: "manual",
      recipeId: null,
      title: manual.name,
      thumbnailUrl: manual.photoUrl,
      loggedAt: manual.loggedAt.toISOString(),
      rating: null,
      caloriesPerServing: manual.caloriesPerServing,
      proteinGrams: manual.proteinGrams,
      carbsGrams: manual.carbsGrams,
      fatGrams: manual.fatGrams,
      orderedViaApp: false,
    });
  }

  meals.sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());

  const loggedCount = logs.length + manualLogs.length;

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
  const highCarb = loggedCount > 0 && macroPct.carbs >= 50;
  const highProtein = loggedCount > 0 && macroPct.protein >= 35;
  const lowCalorie = loggedCount > 0 && avgDailyCalories < 350;
  const insight = computeWeekTabInsight(macroPct, avgDailyCalories, loggedCount);

  let recommendations: {
    recipeId: string;
    title: string;
    thumbnailUrl: string | null;
    reason: string;
    badge: "high-protein" | "light";
  }[] = [];
  if (loggedCount > 0) {
    const allRecipes = await prisma.recipe.findMany({
      where: { id: { notIn: [...cookedRecipeIds] } },
      orderBy: { createdAt: "desc" },
    });

    const scored: (typeof recommendations)[number][] = [];
    for (const recipe of allRecipes) {
      const nutrition = safeParseNutrition(recipe.nutritionJson);
      const thumbnailUrl = recipe.thumbnailUrl ?? (recipe.thumbnailPath ? `/api/media/${recipe.thumbnailPath}` : null);
      const badge: "high-protein" | "light" = (nutrition?.proteinGrams ?? 0) >= 20 ? "high-protein" : "light";

      if (highCarb && nutrition?.proteinGrams != null && nutrition.proteinGrams >= 20) {
        scored.push({ recipeId: recipe.id, title: recipe.title, thumbnailUrl, reason: "Balances your week 💪", badge });
      } else if (
        highProtein &&
        (nutrition?.caloriesPerServing == null ||
          nutrition.caloriesPerServing <= 400 ||
          recipe.dietType === "vegan" ||
          recipe.dietType === "vegetarian")
      ) {
        scored.push({
          recipeId: recipe.id,
          title: recipe.title,
          thumbnailUrl,
          reason: "A lighter pick to balance your week 🥗",
          badge,
        });
      } else if (lowCalorie && COMFORT_FOOD_KEYWORDS.some((k) => recipe.title.toLowerCase().includes(k))) {
        scored.push({ recipeId: recipe.id, title: recipe.title, thumbnailUrl, reason: "A cozy treat to balance your week 🍰", badge });
      }
      if (scored.length >= 3) break;
    }
    recommendations = scored;
  }

  return NextResponse.json({
    weekOffset,
    weekStart: start.toISOString().slice(0, 10),
    weekEnd: new Date(end.getTime() - DAY_MS).toISOString().slice(0, 10),
    streakDays,
    totals: {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
    },
    goals: user ? resolveGoals(user) : resolveGoals({ goalCalories: null, goalProtein: null, goalCarbs: null, goalFat: null }),
    daily: daily.map((d) => ({ ...d, calories: Math.round(d.calories) })),
    macroPct,
    insight,
    meals,
    recommendations,
  });
}
