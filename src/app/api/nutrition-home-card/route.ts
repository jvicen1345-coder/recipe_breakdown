import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { computeWeekInsight } from "@/lib/nutritionInsight";
import { prisma } from "@/lib/prisma";
import type { Nutrition } from "@/lib/types";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

// Generic reference daily targets — this card doesn't factor in the account's own
// nutrition goals (see resolveGoals/nutrition-snapshot), so these stand in for "a
// typical day" when figuring out what's still left to eat today. Not medical
// advice, just a rough anchor for the nudge.
const DAILY_TARGETS = { calories: 2000, protein: 100, carbs: 250, fat: 65 };

function safeParseNutrition(json: string | null): Nutrition | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as Nutrition) : null;
  } catch {
    return null;
  }
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function getThisWeekStart(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = (day + 6) % 7;
  const start = startOfDay(now);
  start.setDate(start.getDate() - diffToMonday);
  return start;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const today = startOfDay(new Date());
  const weekStart = getThisWeekStart();
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const streakWindowStart = new Date(today);
  streakWindowStart.setDate(today.getDate() - 90);

  const [weekLogs, streakWindowLogs, todayLogs] = await Promise.all([
    prisma.cookLog.findMany({
      where: { userId, cookedAt: { gte: weekStart, lt: weekEnd } },
      include: { recipe: true },
    }),
    prisma.cookLog.findMany({
      where: { userId, cookedAt: { gte: streakWindowStart, lt: tomorrow } },
      select: { cookedAt: true },
    }),
    prisma.cookLog.findMany({
      where: { userId, cookedAt: { gte: today, lt: tomorrow } },
      include: { recipe: true },
    }),
  ]);

  const hasCookedThisWeek = weekLogs.length > 0;

  // --- Week macro split (for the macro bars/tiles) ---
  const weekTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const log of weekLogs) {
    const n = safeParseNutrition(log.recipe.nutritionJson);
    if (!n) continue;
    weekTotals.calories += n.caloriesPerServing ?? 0;
    weekTotals.protein += n.proteinGrams ?? 0;
    weekTotals.carbs += n.carbsGrams ?? 0;
    weekTotals.fat += n.fatGrams ?? 0;
  }
  const macroCalories = weekTotals.protein * 4 + weekTotals.carbs * 4 + weekTotals.fat * 9;
  const weekMacroPct =
    macroCalories > 0
      ? {
          protein: Math.round(((weekTotals.protein * 4) / macroCalories) * 100),
          carbs: Math.round(((weekTotals.carbs * 4) / macroCalories) * 100),
          fat: Math.round(((weekTotals.fat * 9) / macroCalories) * 100),
        }
      : { protein: 0, carbs: 0, fat: 0 };

  // --- Day marks + streak (which days this week/recently had a cook logged) ---
  const cookedDateKeys = new Set(streakWindowLogs.map((log) => dateKey(log.cookedAt)));
  const dayMarks = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = dateKey(d);
    return { date: key, label: DAY_LABELS[i], cooked: cookedDateKeys.has(key), isToday: key === dateKey(today) };
  });

  let streakDays = 0;
  const cursor = new Date(today);
  if (!cookedDateKeys.has(dateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (cookedDateKeys.has(dateKey(cursor))) {
    streakDays++;
    cursor.setDate(cursor.getDate() - 1);
  }

  // --- Today's remaining budget + a recommendation to help close the biggest gap ---
  const todayCookedIds = new Set(todayLogs.map((log) => log.recipeId));
  const todayTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const log of todayLogs) {
    const n = safeParseNutrition(log.recipe.nutritionJson);
    if (!n) continue;
    todayTotals.calories += n.caloriesPerServing ?? 0;
    todayTotals.protein += n.proteinGrams ?? 0;
    todayTotals.carbs += n.carbsGrams ?? 0;
    todayTotals.fat += n.fatGrams ?? 0;
  }
  const remaining = {
    calories: DAILY_TARGETS.calories - todayTotals.calories,
    protein: DAILY_TARGETS.protein - todayTotals.protein,
    carbs: DAILY_TARGETS.carbs - todayTotals.carbs,
    fat: DAILY_TARGETS.fat - todayTotals.fat,
  };

  let recommendation: { recipeId: string; title: string; thumbnailUrl: string | null; reason: string } | null = null;
  let message: string;

  if (!hasCookedThisWeek) {
    message = "Cook something and mark it made in Cook Mode to see your week take shape here! 🌸";
  } else if (remaining.calories <= 100) {
    message = "You've basically hit today's goal — nice work! 🎉";
  } else {
    const ratios = {
      protein: remaining.protein / DAILY_TARGETS.protein,
      carbs: remaining.carbs / DAILY_TARGETS.carbs,
      fat: remaining.fat / DAILY_TARGETS.fat,
    };
    const neededMacro = (Object.entries(ratios) as [keyof typeof ratios, number][]).sort(
      (a, b) => b[1] - a[1],
    )[0][0];

    const candidates = await prisma.recipe.findMany({
      where: { userId, id: { notIn: [...todayCookedIds] } },
      orderBy: { createdAt: "desc" },
    });

    for (const recipe of candidates) {
      const n = safeParseNutrition(recipe.nutritionJson);
      if (!n) continue;
      const fitsCalories = n.caloriesPerServing == null || n.caloriesPerServing <= Math.max(remaining.calories, 200);
      if (!fitsCalories) continue;

      if (neededMacro === "protein" && (n.proteinGrams ?? 0) >= 20) {
        recommendation = {
          recipeId: recipe.id,
          title: recipe.title,
          thumbnailUrl: recipe.thumbnailUrl ?? (recipe.thumbnailPath ? `/api/media/${recipe.thumbnailPath}` : null),
          reason: "Packed with protein 💪",
        };
        break;
      }
      if (neededMacro === "carbs" && (n.carbsGrams ?? 0) >= 30) {
        recommendation = {
          recipeId: recipe.id,
          title: recipe.title,
          thumbnailUrl: recipe.thumbnailUrl ?? (recipe.thumbnailPath ? `/api/media/${recipe.thumbnailPath}` : null),
          reason: "A solid carb pick 🍝",
        };
        break;
      }
      if (neededMacro === "fat" && (n.fatGrams ?? 0) >= 15) {
        recommendation = {
          recipeId: recipe.id,
          title: recipe.title,
          thumbnailUrl: recipe.thumbnailUrl ?? (recipe.thumbnailPath ? `/api/media/${recipe.thumbnailPath}` : null),
          reason: "Adds healthy fats ✨",
        };
        break;
      }
    }

    const caloriesLeft = Math.round(Math.max(remaining.calories, 0));
    message = recommendation
      ? `${caloriesLeft} cal left today — "${recommendation.title}" ${recommendation.reason.toLowerCase()}`
      : `${caloriesLeft} cal left today — plenty of room for something new ✨`;
  }

  const insight = computeWeekInsight(weekMacroPct, weekTotals.calories / 7, weekLogs.length);

  const body: {
    hasCookedThisWeek: boolean;
    weekMacroPct: typeof weekMacroPct;
    totals: { calories: number; protein: number; carbs: number; fat: number };
    dayMarks: typeof dayMarks;
    streakDays: number;
    recommendation: typeof recommendation;
    message: string;
    insight: string;
  } = {
    hasCookedThisWeek,
    weekMacroPct,
    totals: {
      calories: Math.round(weekTotals.calories),
      protein: Math.round(weekTotals.protein),
      carbs: Math.round(weekTotals.carbs),
      fat: Math.round(weekTotals.fat),
    },
    dayMarks,
    streakDays,
    recommendation,
    message,
    insight,
  };

  return NextResponse.json(body);
}
