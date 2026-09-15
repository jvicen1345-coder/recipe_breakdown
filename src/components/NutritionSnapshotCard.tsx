"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";

import type { HomeNutritionCard } from "@/lib/types";

const MACRO_TILES: { key: "calories" | "protein" | "carbs" | "fat"; unit: string; emoji: string }[] = [
  { key: "calories", unit: "", emoji: "🔥" },
  { key: "protein", unit: "g", emoji: "💪" },
  { key: "carbs", unit: "g", emoji: "🍞" },
  { key: "fat", unit: "g", emoji: "🥑" },
];

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
    <div className="flex h-full flex-col gap-3 rounded-[1.9rem] bg-white p-5 shadow-[0_10px_30px_-18px_rgba(192,120,140,0.4)] ring-1 ring-blush-dark/30">
      <div className="flex items-center justify-between gap-2">
        <span className="font-serif text-base font-semibold text-rose-deep">This Week 📊</span>
        <Link
          href="/nutrition"
          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-dusty-rose hover:text-rose-deep"
        >
          See more <ArrowRight size={11} />
        </Link>
      </div>

      {!data.hasCookedThisWeek ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4 text-center">
          <span className="text-2xl">🌸</span>
          <p className="text-sm font-medium text-dusty-rose">Cook something to start your week 🌸</p>
          {onStartCooking && (
            <button
              type="button"
              onClick={onStartCooking}
              className="rounded-full bg-gradient-to-r from-coral to-rose-deep px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-105"
            >
              Start Cooking 🍳
            </button>
          )}
        </div>
      ) : (
        <Link href="/nutrition" className="flex flex-1 flex-col gap-3">
          <p className="line-clamp-1 font-serif text-lg leading-snug font-semibold text-rose-deep">
            <span aria-hidden>✨ </span>
            {data.insight}
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {MACRO_TILES.map((tile) => (
              <span key={tile.key} className="flex items-center gap-1.5 text-sm font-semibold text-rose-deep">
                <span aria-hidden>{tile.emoji}</span>
                {data.totals[tile.key]}
                {tile.unit}
              </span>
            ))}
          </div>

          <div className="mt-auto flex items-end justify-between gap-3">
            <div className="flex flex-col gap-1.5">
              <div className="flex gap-1">
                {data.dayMarks.map((day) => (
                  <span
                    key={day.date}
                    className={`h-4 w-4 rounded-full transition ${
                      day.cooked ? "bg-gradient-to-br from-blush-dark to-coral" : "border border-blush-dark/40 bg-cream/40"
                    } ${day.isToday ? "ring-1 ring-coral-deep ring-offset-1 ring-offset-white" : ""}`}
                  />
                ))}
              </div>
              {data.streakDays > 0 && (
                <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-peach px-2 py-0.5 text-[10px] font-semibold text-peach-dark">
                  <Flame size={10} /> {data.streakDays}d streak
                </span>
              )}
            </div>
          </div>

          <p className="text-[10px] text-dusty-rose/70">AI-estimated 🌸</p>
        </Link>
      )}
    </div>
  );
}
