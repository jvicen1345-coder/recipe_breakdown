"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";

import type { HomeNutritionCard } from "@/lib/types";

// A soft default weekly goal — there's no user profile/goals system in this app,
// so these stand in for "roughly average" when filling each tile's progress bar.
const WEEKLY_GOAL = { calories: 2000, protein: 120, carbs: 250, fat: 65 };

const MACRO_TILES: {
  key: "calories" | "protein" | "carbs" | "fat";
  label: string;
  unit: string;
  emoji: string;
  bg: string;
  fill: string;
  text: string;
}[] = [
  {
    key: "calories",
    label: "Calories",
    unit: "",
    emoji: "🔥",
    bg: "from-coral/25 to-coral/5",
    fill: "bg-coral",
    text: "text-coral-deep",
  },
  {
    key: "protein",
    label: "Protein",
    unit: "g",
    emoji: "💪",
    bg: "from-lavender/70 to-lavender/15",
    fill: "bg-lavender-dark",
    text: "text-lavender-dark",
  },
  {
    key: "carbs",
    label: "Carbs",
    unit: "g",
    emoji: "🍞",
    bg: "from-peach/70 to-peach/15",
    fill: "bg-peach-dark",
    text: "text-peach-dark",
  },
  {
    key: "fat",
    label: "Fat",
    unit: "g",
    emoji: "🥑",
    bg: "from-sky-200/70 to-sky-50",
    fill: "bg-sky-400",
    text: "text-sky-600",
  },
];

function MacroTile({ tile, value }: { tile: (typeof MACRO_TILES)[number]; value: number }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const pct = Math.max(0, Math.min(100, Math.round((value / WEEKLY_GOAL[tile.key]) * 100)));

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowTooltip((v) => !v);
      }}
      className={`relative flex flex-col items-center gap-0.5 rounded-2xl bg-gradient-to-br px-3 py-3 text-center ${tile.bg}`}
    >
      <span className="text-base">{tile.emoji}</span>
      <span className={`font-serif text-lg font-bold ${tile.text}`}>
        {value}
        {tile.unit}
      </span>
      <span className="text-[10px] font-medium tracking-wide text-dusty-rose uppercase">{tile.label}</span>
      <span className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/60">
        <span className={`block h-full rounded-full ${tile.fill}`} style={{ width: `${pct}%` }} />
      </span>
      {showTooltip && (
        <span className="absolute -bottom-8 left-1/2 z-10 -translate-x-1/2 rounded-full bg-rose-deep px-3 py-1 text-[10px] font-semibold whitespace-nowrap text-white shadow-md">
          {pct}% of your weekly goal 🌸
        </span>
      )}
    </button>
  );
}

export function NutritionSnapshotCard({ onStartCooking }: { onStartCooking?: () => void }) {
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
    <div className="rounded-[1.9rem] bg-gradient-to-br from-blush via-coral/25 to-lavender/40 p-[1.5px] shadow-[0_0_30px_-10px_rgba(240,113,74,0.4)]">
      {!data.hasCookedThisWeek ? (
        <div className="flex flex-col items-center gap-3 rounded-[1.85rem] bg-white/90 p-6 text-center backdrop-blur-sm">
          <span className="text-3xl">📊</span>
          <p className="font-serif text-lg font-semibold text-rose-deep">Cook something and we&apos;ll track your week 💕</p>
          {onStartCooking && (
            <button
              type="button"
              onClick={onStartCooking}
              className="rounded-full bg-gradient-to-r from-coral to-rose-deep px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
            >
              Start Cooking 🍳
            </button>
          )}
        </div>
      ) : (
        <Link
          href="/nutrition"
          className="flex flex-col gap-4 rounded-[1.85rem] bg-white/90 p-5 backdrop-blur-sm transition hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between gap-3">
            <p className="font-serif text-2xl leading-snug font-semibold text-rose-deep">
              <span aria-hidden>✨ </span>
              {data.insight}
            </p>
            <span className="mt-1 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-dusty-rose">
              See more <ArrowRight size={12} />
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-1.5">
              {data.dayMarks.map((day) => (
                <span
                  key={day.date}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold transition ${
                    day.cooked
                      ? "bg-gradient-to-br from-blush-dark to-coral text-white"
                      : "border border-blush-dark/40 bg-cream/40 text-dusty-rose"
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

          <div className="grid grid-cols-2 gap-2">
            {MACRO_TILES.map((tile) => (
              <MacroTile key={tile.key} tile={tile} value={data.totals[tile.key]} />
            ))}
          </div>

          <p className="text-[11px] text-dusty-rose/70">AI-estimated nutrition 🌸</p>
        </Link>
      )}
    </div>
  );
}
