"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { RecipeThumbnail } from "./RecipeThumbnail";
import type { NutritionSnapshot } from "@/lib/types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// A soft weekly goal (7x a typical day) — there's no user profile/goals system in
// this app, so this stands in for "roughly average" when drawing the progress
// arcs. Not medical advice, just a rough anchor.
const WEEKLY_TARGETS = { calories: 14000, protein: 700, carbs: 1750, fat: 455 };

function formatWeekLabel(weekOffset: number, weekStart: string, weekEnd: string): string {
  if (weekOffset === 0) return "This Week";
  if (weekOffset === -1) return "Last Week";
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(`${weekEnd}T00:00:00`);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

function ProgressArc({ pct, label, value, unit }: { pct: number; label: string; value: number; unit: string }) {
  const clamped = Math.max(0, Math.min(100, pct));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-cream-soft px-2 py-3">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
          <circle cx="32" cy="32" r={radius} fill="none" stroke="#f6dde3" strokeWidth="6" />
          <circle
            cx="32"
            cy="32"
            r={radius}
            fill="none"
            stroke="url(#arcGradient)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
          <defs>
            <linearGradient id="arcGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ff9a76" />
              <stop offset="100%" stopColor="#c05878" />
            </linearGradient>
          </defs>
        </svg>
        <span className="absolute font-serif text-sm font-semibold text-rose-deep">
          {value}
          {unit}
        </span>
      </div>
      <span className="text-[10px] font-medium tracking-wide text-dusty-rose uppercase">{label}</span>
    </div>
  );
}

export function NutritionSnapshotPageClient() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [snapshot, setSnapshot] = useState<NutritionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  // Calorie/macro totals depend on recipes having AI-estimated nutrition, which not
  // every recipe has — so whether anything was cooked this week (which gates the
  // "Cooked this week" list) is judged separately from whether there's enough
  // nutrition data to bother charting.
  const hasCookedThisWeek = snapshot ? snapshot.cookedRecipes.length > 0 : false;
  const hasNutritionData = snapshot ? snapshot.totals.calories > 0 : false;

  const dayCookedSet = useMemo(() => {
    if (!snapshot) return new Set<string>();
    return new Set(snapshot.cookedRecipes.map((r) => r.cookedAt.slice(0, 10)));
  }, [snapshot]);

  const visibleCookedRecipes = useMemo(() => {
    if (!snapshot) return [];
    if (!selectedDay) return snapshot.cookedRecipes;
    return snapshot.cookedRecipes.filter((r) => r.cookedAt.slice(0, 10) === selectedDay);
  }, [snapshot, selectedDay]);

  return (
    <div className="page-fade-in mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold text-rose-deep">This Week 📊</h1>
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
      ) : !hasCookedThisWeek ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-blush-dark p-16 text-center text-dusty-rose">
          <span className="text-4xl">🌸</span>
          <p className="font-serif text-lg text-rose-deep">Nothing logged this week</p>
          <p className="text-sm">Cook a saved recipe and mark it made to fill this in ✨</p>
        </div>
      ) : (
        <>
          <div>
            <div className="flex justify-between gap-1">
              {snapshot.daily.map((day, i) => {
                const cooked = dayCookedSet.has(day.date);
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
                        cooked ? "bg-gradient-to-br from-coral to-rose-deep text-white" : "bg-blush-soft text-dusty-rose"
                      } ${active ? "ring-2 ring-coral-deep ring-offset-2 ring-offset-cream" : ""}`}
                    >
                      {cooked ? "🍳" : ""}
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
            <>
              <p className="font-serif text-2xl leading-snug font-semibold text-rose-deep">{snapshot.insight}</p>

              <div className="grid grid-cols-2 gap-3">
                <ProgressArc
                  pct={(snapshot.totals.calories / WEEKLY_TARGETS.calories) * 100}
                  label="Calories"
                  value={snapshot.totals.calories}
                  unit=""
                />
                <ProgressArc
                  pct={(snapshot.totals.protein / WEEKLY_TARGETS.protein) * 100}
                  label="Protein"
                  value={snapshot.totals.protein}
                  unit="g"
                />
                <ProgressArc
                  pct={(snapshot.totals.carbs / WEEKLY_TARGETS.carbs) * 100}
                  label="Carbs"
                  value={snapshot.totals.carbs}
                  unit="g"
                />
                <ProgressArc
                  pct={(snapshot.totals.fat / WEEKLY_TARGETS.fat) * 100}
                  label="Fat"
                  value={snapshot.totals.fat}
                  unit="g"
                />
              </div>
            </>
          )}

          <section>
            <h2 className="mb-3 font-serif text-lg font-semibold text-rose-deep">
              {selectedDay
                ? `Cooked ${new Date(`${selectedDay}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}`
                : "Cooked this week"}
            </h2>
            {visibleCookedRecipes.length === 0 ? (
              <p className="rounded-2xl bg-white/70 p-4 text-center text-sm text-dusty-rose ring-1 ring-blush-dark/40">
                Nothing cooked that day.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {visibleCookedRecipes.map((log) => (
                  <li
                    key={log.logId}
                    className="flex items-center gap-3 rounded-2xl bg-white/70 p-2 ring-1 ring-blush-dark/40"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-blush-soft">
                      <RecipeThumbnail src={log.thumbnailUrl} alt={log.title} className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-rose-deep">{log.title}</p>
                      <p className="text-xs text-dusty-rose">
                        {new Date(log.cookedAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                        {log.caloriesPerServing != null ? ` · ${log.caloriesPerServing} cal` : ""}
                        {log.proteinGrams != null ? ` · ${log.proteinGrams}g protein` : ""}
                        {log.carbsGrams != null ? ` · ${log.carbsGrams}g carbs` : ""}
                        {log.fatGrams != null ? ` · ${log.fatGrams}g fat` : ""}
                      </p>
                      {log.orderedViaApp && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-sage/20 px-2 py-0.5 text-[10px] font-semibold text-sage-dark">
                          🛒 Ordered via Cutesy Eats
                        </span>
                      )}
                    </div>
                    {log.rating != null && <span className="shrink-0 text-xs">{"⭐".repeat(log.rating)}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {snapshot.recommendations.length > 0 && (
            <section>
              <h2 className="mb-3 font-serif text-lg font-semibold text-rose-deep">Recommended to balance your week</h2>
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
                        Balances your week 💪
                      </span>
                      <p className="text-xs text-coral-deep">{rec.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <p className="text-center text-[11px] text-dusty-rose/70">Nutrition is AI-estimated and may not be exact 🌸</p>
    </div>
  );
}
