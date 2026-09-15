"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Flame, Plus } from "lucide-react";

import { AdjustGoalsSheet } from "./AdjustGoalsSheet";
import { LogMealSheet } from "./LogMealSheet";
import { RecipeThumbnail } from "./RecipeThumbnail";
import type { MacroGoals } from "@/lib/nutritionGoals";
import type { NutritionSnapshot, WeekMealEntry } from "@/lib/types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MACRO_TILES: {
  key: keyof MacroGoals;
  label: string;
  emoji: string;
  bg: string;
  fill: string;
  text: string;
}[] = [
  { key: "calories", label: "Calories", emoji: "🔥", bg: "from-coral/25 to-coral/5", fill: "bg-coral", text: "text-coral-deep" },
  {
    key: "protein",
    label: "Protein",
    emoji: "💪",
    bg: "from-lavender/70 to-lavender/15",
    fill: "bg-lavender-dark",
    text: "text-lavender-dark",
  },
  { key: "carbs", label: "Carbs", emoji: "🍞", bg: "from-peach/70 to-peach/15", fill: "bg-peach-dark", text: "text-peach-dark" },
  { key: "fat", label: "Fat", emoji: "🥑", bg: "from-sky-200/70 to-sky-50", fill: "bg-sky-400", text: "text-sky-600" },
];

function formatWeekLabel(weekOffset: number, weekStart: string, weekEnd: string): string {
  if (weekOffset === 0) return "This Week";
  if (weekOffset === -1) return "Last Week";
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(`${weekEnd}T00:00:00`);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function MacroGoalTile({ tile, value, goal }: { tile: (typeof MACRO_TILES)[number]; value: number; goal: number }) {
  const pct = goal > 0 ? Math.max(0, Math.min(100, Math.round((value / goal) * 100))) : 0;
  return (
    <div className={`flex flex-col items-center gap-1 rounded-2xl bg-gradient-to-br px-3 py-4 text-center ${tile.bg}`}>
      <span className="text-xl">{tile.emoji}</span>
      <span className={`font-serif text-2xl font-bold ${tile.text}`}>{value}</span>
      <span className="text-[10px] font-medium tracking-wide text-dusty-rose uppercase">{tile.label}</span>
      <span className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/60">
        <span className={`block h-full rounded-full ${tile.fill}`} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}

function MealRow({ meal }: { meal: WeekMealEntry }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="rounded-2xl bg-white/70 ring-1 ring-blush-dark/40">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-2 text-left"
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-blush-soft">
          <RecipeThumbnail src={meal.thumbnailUrl} alt={meal.title} className="h-full w-full" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-medium text-rose-deep">
            {meal.title}
            {meal.kind === "manual" && (
              <span className="shrink-0 rounded-full bg-lavender px-2 py-0.5 text-[9px] font-semibold text-lavender-dark">
                Manual log
              </span>
            )}
          </p>
          <p className="text-xs text-dusty-rose">
            {new Date(meal.loggedAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </p>
          {meal.orderedViaApp && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-sage/20 px-2 py-0.5 text-[10px] font-semibold text-sage-dark">
              🛒 Ordered via Cutesy Eats
            </span>
          )}
        </div>
        {meal.rating != null && <span className="shrink-0 text-xs">{"⭐".repeat(meal.rating)}</span>}
        <ChevronDown size={14} className={`shrink-0 text-dusty-rose transition ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="flex flex-wrap gap-3 border-t border-blush-dark/30 px-4 py-2.5 text-xs text-dusty-rose">
          <span>🔥 {meal.caloriesPerServing ?? "—"} cal</span>
          <span>💪 {meal.proteinGrams ?? "—"}g protein</span>
          <span>🍞 {meal.carbsGrams ?? "—"}g carbs</span>
          <span>🥑 {meal.fatGrams ?? "—"}g fat</span>
        </div>
      )}
    </li>
  );
}

export function NutritionSnapshotPageClient() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [snapshot, setSnapshot] = useState<NutritionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showGoalsSheet, setShowGoalsSheet] = useState(false);
  const [showLogMealSheet, setShowLogMealSheet] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting loading state for the newly-selected week
    setLoading(true);
    setSelectedDay(null);
    fetch(`/api/nutrition-snapshot?weekOffset=${weekOffset}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSnapshot(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [weekOffset]);

  const hasLoggedThisWeek = snapshot ? snapshot.meals.length > 0 : false;
  const hasNutritionData = snapshot ? snapshot.totals.calories > 0 : false;

  const dayLoggedSet = useMemo(() => {
    if (!snapshot) return new Set<string>();
    return new Set(snapshot.meals.map((m) => m.loggedAt.slice(0, 10)));
  }, [snapshot]);

  const visibleMeals = useMemo(() => {
    if (!snapshot) return [];
    if (!selectedDay) return snapshot.meals;
    return snapshot.meals.filter((m) => m.loggedAt.slice(0, 10) === selectedDay);
  }, [snapshot, selectedDay]);

  function handleMealSaved(meal: WeekMealEntry) {
    setSnapshot((prev) => {
      if (!prev) return prev;
      const totals = {
        calories: prev.totals.calories + (meal.caloriesPerServing ?? 0),
        protein: prev.totals.protein + (meal.proteinGrams ?? 0),
        carbs: prev.totals.carbs + (meal.carbsGrams ?? 0),
        fat: prev.totals.fat + (meal.fatGrams ?? 0),
      };
      return { ...prev, totals, meals: [...prev.meals, meal].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)) };
    });
  }

  return (
    <div className="page-fade-in mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold text-rose-deep">This Week 📊</h1>
        {snapshot && snapshot.streakDays > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-peach px-3 py-1.5 text-xs font-semibold text-peach-dark">
            <Flame size={13} /> {snapshot.streakDays}d streak
          </span>
        )}
      </div>

      <div className="flex items-center justify-between rounded-full bg-white/70 px-3 py-2 shadow-sm ring-1 ring-blush-dark/40">
        <button
          type="button"
          onClick={() => setWeekOffset((w) => w - 1)}
          aria-label="Previous week"
          className="flex h-8 w-8 items-center justify-center rounded-full text-rose-deep transition hover:bg-blush"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-rose-deep">
          {snapshot ? formatWeekLabel(weekOffset, snapshot.weekStart, snapshot.weekEnd) : "…"}
        </span>
        <button
          type="button"
          onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
          disabled={weekOffset === 0}
          aria-label="Next week"
          className="flex h-8 w-8 items-center justify-center rounded-full text-rose-deep transition hover:bg-blush disabled:opacity-30"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {loading || !snapshot ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-blush-dark p-16 text-center text-dusty-rose">
          <span className="text-3xl">📊</span>
          <p className="text-sm">Loading your week…</p>
        </div>
      ) : !hasLoggedThisWeek ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-blush-dark p-16 text-center text-dusty-rose">
          <span className="text-4xl">🌸</span>
          <p className="font-serif text-lg text-rose-deep">Nothing logged this week</p>
          <p className="text-sm">Cook a saved recipe and mark it made, or log a meal, to fill this in ✨</p>
          <button
            type="button"
            onClick={() => setShowLogMealSheet(true)}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-coral to-rose-deep px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
          >
            <Plus size={14} /> Log a meal
          </button>
        </div>
      ) : (
        <>
          <div>
            <div className="flex justify-between gap-1">
              {snapshot.daily.map((day, i) => {
                const logged = dayLoggedSet.has(day.date);
                const active = selectedDay === day.date;
                return (
                  <button
                    key={day.date}
                    type="button"
                    onClick={() => setSelectedDay((prev) => (prev === day.date ? null : day.date))}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold transition ${
                        logged ? "bg-gradient-to-br from-coral to-rose-deep text-white" : "bg-blush-soft text-dusty-rose"
                      } ${active ? "ring-2 ring-coral-deep ring-offset-2 ring-offset-cream" : ""}`}
                    >
                      {logged ? "🍳" : ""}
                    </span>
                    <span className="text-[11px] font-medium text-dusty-rose">{DAY_LABELS[i]}</span>
                  </button>
                );
              })}
            </div>
            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="mt-2 text-xs font-medium text-dusty-rose underline-offset-2 hover:underline"
              >
                Clear day filter
              </button>
            )}
          </div>

          {hasNutritionData && (
            <section className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-3">
                {MACRO_TILES.map((tile) => (
                  <MacroGoalTile
                    key={tile.key}
                    tile={tile}
                    value={snapshot.totals[tile.key]}
                    goal={snapshot.goals[tile.key] * 7}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => setShowGoalsSheet(true)}
                className="self-center text-xs font-medium text-dusty-rose underline-offset-2 hover:underline"
              >
                Adjust my goals 🎀
              </button>
            </section>
          )}

          {snapshot.insight && (
            <p className="font-serif text-2xl leading-snug font-semibold text-rose-deep">{snapshot.insight}</p>
          )}

          {snapshot.recommendations.length > 0 && (
            <section>
              <h2 className="mb-3 font-serif text-lg font-semibold text-rose-deep">To balance your week 💕</h2>
              <div className="flex flex-col gap-2">
                {snapshot.recommendations.map((rec) => (
                  <div
                    key={rec.recipeId}
                    className="flex items-center gap-3 rounded-2xl bg-white/70 p-2 ring-1 ring-blush-dark/40"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-blush-soft">
                      <RecipeThumbnail src={rec.thumbnailUrl} alt={rec.title} className="h-full w-full" />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <p className="truncate text-sm font-medium text-rose-deep">{rec.title}</p>
                      <span className="inline-flex w-fit items-center gap-1 rounded-full bg-sage/20 px-2 py-0.5 text-[10px] font-semibold text-sage-dark">
                        {rec.badge === "high-protein" ? "High protein 💪" : "Light option 🥗"}
                      </span>
                      <p className="text-xs text-coral-deep">{rec.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-lg font-semibold text-rose-deep">
                {selectedDay
                  ? `Logged ${new Date(`${selectedDay}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}`
                  : "This week's meals 🍽️"}
              </h2>
            </div>
            {visibleMeals.length === 0 ? (
              <p className="rounded-2xl bg-white/70 p-4 text-center text-sm text-dusty-rose ring-1 ring-blush-dark/40">
                Nothing logged that day.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {visibleMeals.map((meal) => (
                  <MealRow key={`${meal.kind}-${meal.id}`} meal={meal} />
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => setShowLogMealSheet(true)}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-dashed border-blush-dark/60 py-2.5 text-sm font-medium text-dusty-rose transition hover:border-coral hover:text-coral-deep"
            >
              <Plus size={14} /> Log a meal
            </button>
          </section>
        </>
      )}

      <p className="text-center text-[11px] text-dusty-rose/70">Nutrition is AI-estimated and may not be exact 🌸</p>

      {showGoalsSheet && snapshot && (
        <AdjustGoalsSheet
          initialGoals={snapshot.goals}
          onClose={() => setShowGoalsSheet(false)}
          onSaved={(goals) => setSnapshot((prev) => (prev ? { ...prev, goals } : prev))}
        />
      )}
      {showLogMealSheet && <LogMealSheet onClose={() => setShowLogMealSheet(false)} onSaved={handleMealSaved} />}
    </div>
  );
}
