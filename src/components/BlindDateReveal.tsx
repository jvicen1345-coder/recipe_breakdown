"use client";

import { useState } from "react";
import { ChefHat, Clock3, X } from "lucide-react";

import { CookMode } from "./CookMode";
import { RecipeThumbnail } from "./RecipeThumbnail";
import { getCookedTimestamps } from "@/lib/clientState";
import { formatMinutes } from "@/lib/format";
import type { RecipeDto } from "@/lib/types";

function pickBlindDate(recipes: RecipeDto[], excludeId?: string): RecipeDto | null {
  const cooked = getCookedTimestamps();
  const now = Date.now();
  const notRecentlyMade = recipes.filter((r) => {
    const ts = cooked[r.id];
    if (!ts) return true;
    return (now - new Date(ts).getTime()) / 86_400_000 >= 7;
  });
  const pool = (notRecentlyMade.length > 0 ? notRecentlyMade : recipes).filter((r) => r.id !== excludeId);
  const finalPool = pool.length > 0 ? pool : recipes;
  if (finalPool.length === 0) return null;
  return finalPool[Math.floor(Math.random() * finalPool.length)];
}

export function BlindDateReveal({ recipes, onClose }: { recipes: RecipeDto[]; onClose: () => void }) {
  const [date, setDate] = useState<RecipeDto | null>(() => pickBlindDate(recipes));
  const [revealKey, setRevealKey] = useState(0);
  const [cooking, setCooking] = useState(false);

  if (cooking && date) {
    return <CookMode recipe={date} onClose={onClose} introMessage="Great pick! Let's get cooking 🍳" />;
  }

  function handleReroll() {
    setDate((prev) => pickBlindDate(recipes, prev?.id));
    setRevealKey((k) => k + 1);
  }

  return (
    <div className="overlay-fade-in fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-lavender/40 via-cream to-cream-soft">
      <div className="flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close blind date"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-rose-deep shadow-sm transition hover:bg-white"
        >
          <X size={18} />
        </button>
        <span className="font-serif text-lg font-semibold text-rose-deep">Blind Date 🙈</span>
        <span className="w-9" />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-6">
        {!date ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-4xl">🌸</span>
            <p className="font-serif text-xl font-semibold text-rose-deep">Save a recipe first!</p>
            <p className="text-sm text-dusty-rose">We need at least one saved recipe to set you up ✨</p>
          </div>
        ) : (
          <>
            <p className="font-serif text-2xl font-semibold text-rose-deep">Tonight&apos;s blind date is... 👀</p>

            <div
              key={revealKey}
              className="card-fade-in w-full max-w-sm overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_50px_-20px_rgba(192,120,140,0.55)]"
            >
              <div className="relative aspect-[4/5] w-full bg-blush-soft">
                <RecipeThumbnail src={date.thumbnailUrl} alt={date.title} className="h-full w-full" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />
              </div>
              <div className="flex flex-col gap-2 px-5 py-4">
                <h3 className="font-serif text-xl font-semibold text-rose-deep">{date.title}</h3>
                <div className="flex flex-wrap gap-3 text-xs text-dusty-rose">
                  {date.totalTimeMinutes != null && (
                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={12} /> {formatMinutes(date.totalTimeMinutes)}
                    </span>
                  )}
                  {date.difficulty && (
                    <span className="inline-flex items-center gap-1">
                      <ChefHat size={12} /> {date.difficulty}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReroll}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-rose-deep shadow-[0_10px_25px_-10px_rgba(192,120,140,0.5)] transition hover:-translate-y-0.5"
              >
                Not feeling it? 👋
              </button>
              <button
                type="button"
                onClick={() => setCooking(true)}
                className="rounded-full bg-gradient-to-r from-lavender-dark to-rose-deep px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
              >
                Let&apos;s cook! 🍳
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
