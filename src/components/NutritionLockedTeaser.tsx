"use client";

import { BarChart3 } from "lucide-react";

import { useProUpsell } from "./ProUpsellProvider";

export function NutritionLockedTeaser() {
  const openUpsell = useProUpsell();

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-coral to-rose-deep text-white shadow-md">
        <BarChart3 size={24} />
      </div>
      <h1 className="font-serif text-2xl font-semibold text-rose-deep">Weekly nutrition snapshots are a Pro perk 📊</h1>
      <p className="text-sm text-dusty-rose">
        See your week&apos;s macros, streaks, and AI recommendations based on what you&apos;ve cooked — upgrade to
        unlock it, plus Cook Mode and smarter grocery lists.
      </p>
      <button
        type="button"
        onClick={() => openUpsell("nutrition-snapshot")}
        className="rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
      >
        Unlock Cutesy Eats Pro ✨
      </button>
    </div>
  );
}
