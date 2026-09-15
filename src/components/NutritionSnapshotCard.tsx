"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";

import type { HomeNutritionCard } from "@/lib/types";

const MACRO_TILES: { key: "calories" | "protein" | "carbs" | "fat"; label: string; unit: string }[] = [
  { key: "calories", label: "Calories", unit: "" },
  { key: "protein", label: "Protein", unit: "g" },
  { key: "carbs", label: "Carbs", unit: "g" },
  { key: "fat", label: "Fat", unit: "g" },
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

  if (!data.hasCookedThisWeek) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl bg-white/75 p-6 text-center shadow-[0_10px_30px_-14px_rgba(192,120,140,0.45)] ring-1 ring-blush-dark/50 backdrop-blur-sm">
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
    );
  }

  return (
    <Link
      href="/nutrition"
      className="flex flex-col gap-4 rounded-3xl bg-white/75 p-5 shadow-[0_10px_30px_-14px_rgba(192,120,140,0.45)] ring-1 ring-blush-dark/50 backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-16px_rgba(192,120,140,0.55)]"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-serif text-xl leading-snug font-semibold text-rose-deep">{data.insight}</p>
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

      <div className="grid grid-cols-2 gap-2">
        {MACRO_TILES.map((tile) => (
          <div key={tile.key} className="flex flex-col gap-0.5 rounded-2xl bg-cream-soft px-3 py-2.5">
            <span className="font-serif text-lg font-semibold text-rose-deep">
              {data.totals[tile.key]}
              {tile.unit}
            </span>
            <span className="text-[10px] font-medium tracking-wide text-dusty-rose uppercase">{tile.label}</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-dusty-rose/70">AI-estimated nutrition 🌸</p>
    </Link>
  );
}
