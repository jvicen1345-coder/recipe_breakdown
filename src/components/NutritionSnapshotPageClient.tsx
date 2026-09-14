"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { RecipeThumbnail } from "./RecipeThumbnail";
import type { NutritionSnapshot } from "@/lib/types";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatWeekLabel(weekOffset: number, weekStart: string, weekEnd: string): string {
  if (weekOffset === 0) return "This Week";
  if (weekOffset === -1) return "Last Week";
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(`${weekEnd}T00:00:00`);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
}

export function NutritionSnapshotPageClient() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [snapshot, setSnapshot] = useState<NutritionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting loading state for the newly-selected week
    setLoading(true);
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

  const hasData = snapshot ? snapshot.totals.calories > 0 : false;
  const maxDaily = snapshot ? Math.max(1, ...snapshot.daily.map((d) => d.calories)) : 1;

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
      ) : !hasData ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-blush-dark p-16 text-center text-dusty-rose">
          <span className="text-4xl">🌸</span>
          <p className="font-serif text-lg text-rose-deep">Nothing logged this week</p>
          <p className="text-sm">Cook a saved recipe and mark it made to fill this in ✨</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Calories", value: snapshot.totals.calories, unit: "" },
              { label: "Protein", value: snapshot.totals.protein, unit: "g" },
              { label: "Carbs", value: snapshot.totals.carbs, unit: "g" },
              { label: "Fat", value: snapshot.totals.fat, unit: "g" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col gap-0.5 rounded-2xl bg-cream-soft px-2 py-3">
                <span className="font-serif text-xl font-semibold text-rose-deep">
                  {stat.value}
                  {stat.unit}
                </span>
                <span className="text-[10px] font-medium tracking-wide text-dusty-rose uppercase">{stat.label}</span>
              </div>
            ))}
          </div>

          <section>
            <h2 className="mb-3 font-serif text-lg font-semibold text-rose-deep">Calories by day</h2>
            {/* Bars must be direct children of the h-32 row — a percentage height only
                resolves against an ancestor with an explicit (non-auto) height, and an
                extra per-day wrapper here would break that chain. */}
            <div className="flex h-32 items-end gap-2">
              {snapshot.daily.map((day) => (
                <div
                  key={day.date}
                  className="flex-1 rounded-t-lg bg-gradient-to-t from-coral to-rose-deep"
                  style={{ height: `${Math.max(4, (day.calories / maxDaily) * 100)}%` }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex gap-2">
              {DAY_LABELS.map((label) => (
                <span key={label} className="flex-1 text-center text-[10px] font-medium text-dusty-rose">
                  {label}
                </span>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-serif text-lg font-semibold text-rose-deep">Macro breakdown</h2>
            <div className="flex flex-col gap-2">
              {[
                { label: "Protein", pct: snapshot.macroPct.protein, className: "from-coral to-coral-deep" },
                { label: "Carbs", pct: snapshot.macroPct.carbs, className: "from-lavender to-lavender-dark" },
                { label: "Fat", pct: snapshot.macroPct.fat, className: "from-peach to-peach-dark" },
              ].map((macro) => (
                <div key={macro.label} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs font-medium text-dusty-rose">{macro.label}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-blush">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${macro.className}`}
                      style={{ width: `${macro.pct}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-semibold text-rose-deep">{macro.pct}%</span>
                </div>
              ))}
            </div>
          </section>

          <p className="text-sm font-medium text-dusty-rose">{snapshot.insight}</p>

          <section>
            <h2 className="mb-3 font-serif text-lg font-semibold text-rose-deep">Cooked this week</h2>
            <ul className="flex flex-col gap-2">
              {snapshot.cookedRecipes.map((log) => (
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
                    </p>
                  </div>
                  {log.rating != null && <span className="shrink-0 text-xs">{"⭐".repeat(log.rating)}</span>}
                </li>
              ))}
            </ul>
          </section>

          {snapshot.recommendations.length > 0 && (
            <section>
              <h2 className="mb-3 font-serif text-lg font-semibold text-rose-deep">Recommended for you</h2>
              <div className="flex flex-col gap-2">
                {snapshot.recommendations.map((rec) => (
                  <div
                    key={rec.recipeId}
                    className="flex items-center gap-3 rounded-2xl bg-white/70 p-2 ring-1 ring-blush-dark/40"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-blush-soft">
                      <RecipeThumbnail src={rec.thumbnailUrl} alt={rec.title} className="h-full w-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-rose-deep">{rec.title}</p>
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
