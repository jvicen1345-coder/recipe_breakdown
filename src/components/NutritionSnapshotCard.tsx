"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3, Flame } from "lucide-react";

import type { HomeNutritionCard } from "@/lib/types";

const MACRO_BARS: { key: "protein" | "carbs" | "fat"; label: string; className: string }[] = [
  { key: "protein", label: "Protein", className: "from-coral to-coral-deep" },
  { key: "carbs", label: "Carbs", className: "from-lavender to-lavender-dark" },
  { key: "fat", label: "Fat", className: "from-peach to-peach-dark" },
];

export function NutritionSnapshotCard() {
  const [data, setData] = useState<HomeNutritionCard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/nutrition-home-card")
      .then((res) => res.json())
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        // Nutrition snapshot is a nice-to-have homepage widget; skip silently on failure.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return null;
  if (!data) return null;

  return (
    <Link
      href="/nutrition"
      className="flex flex-col gap-4 rounded-3xl bg-white/75 p-5 shadow-[0_10px_30px_-14px_rgba(192,120,140,0.45)] ring-1 ring-blush-dark/50 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-16px_rgba(192,120,140,0.55)]"
    >
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-serif text-xl font-semibold text-rose-deep">
          <BarChart3 size={18} className="text-coral" /> This Week 📊
        </h2>
        <span className="inline-flex items-center gap-1 text-xs font-medium text-dusty-rose">
          See more <ArrowRight size={12} />
        </span>
      </div>

      {!data.hasCookedThisWeek ? (
        <p className="text-sm text-dusty-rose">{data.message}</p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {data.dayMarks.map((day) => (
                <span
                  key={day.date}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold transition ${
                    day.cooked ? "bg-gradient-to-br from-coral to-rose-deep text-white" : "bg-blush-soft text-dusty-rose"
                  } ${day.isToday ? "ring-2 ring-coral-deep ring-offset-1 ring-offset-white" : ""}`}
                >
                  {day.label}
                </span>
              ))}
            </div>
            {data.streakDays > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-peach px-2.5 py-1 text-xs font-semibold text-peach-dark">
                <Flame size={12} /> {data.streakDays}d streak
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            {MACRO_BARS.map((macro) => (
              <div key={macro.key} className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-[11px] font-medium text-dusty-rose">{macro.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-blush">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${macro.className}`}
                    style={{ width: `${data.weekMacroPct[macro.key]}%` }}
                  />
                </div>
                <span className="w-9 shrink-0 text-right text-[11px] font-semibold text-rose-deep">
                  {data.weekMacroPct[macro.key]}%
                </span>
              </div>
            ))}
          </div>

          <p className="text-sm font-medium text-dusty-rose">{data.message}</p>
        </>
      )}

      <p className="text-[11px] text-dusty-rose/70">Nutrition is AI-estimated and may not be exact 🌸</p>
    </Link>
  );
}
