"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BarChart3 } from "lucide-react";

import type { NutritionSnapshot } from "@/lib/types";

export function NutritionSnapshotCard() {
  const [snapshot, setSnapshot] = useState<NutritionSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/nutrition-snapshot?weekOffset=0")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSnapshot(data);
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
  if (!snapshot) return null;

  const hasData = snapshot.totals.calories > 0;
  const maxDaily = Math.max(1, ...snapshot.daily.map((d) => d.calories));

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

      {!hasData ? (
        <p className="text-sm text-dusty-rose">
          Cook something and mark it made in Cook Mode to see your week take shape here! 🌸
        </p>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { label: "Calories", value: snapshot.totals.calories, unit: "" },
              { label: "Protein", value: snapshot.totals.protein, unit: "g" },
              { label: "Carbs", value: snapshot.totals.carbs, unit: "g" },
              { label: "Fat", value: snapshot.totals.fat, unit: "g" },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col gap-0.5 rounded-2xl bg-cream-soft px-2 py-2.5">
                <span className="font-serif text-lg font-semibold text-rose-deep">
                  {stat.value}
                  {stat.unit}
                </span>
                <span className="text-[10px] font-medium tracking-wide text-dusty-rose uppercase">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="flex h-10 items-end gap-1.5">
            {snapshot.daily.map((day) => (
              <div
                key={day.date}
                className="flex-1 rounded-t-sm bg-gradient-to-t from-coral to-rose-deep"
                style={{ height: `${Math.max(6, (day.calories / maxDaily) * 100)}%` }}
              />
            ))}
          </div>

          <p className="text-sm font-medium text-dusty-rose">{snapshot.insight}</p>
        </>
      )}

      <p className="text-[11px] text-dusty-rose/70">Nutrition is AI-estimated and may not be exact 🌸</p>
    </Link>
  );
}
