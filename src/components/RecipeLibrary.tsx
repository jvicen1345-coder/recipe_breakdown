"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";

import { CollectionImport } from "./CollectionImport";
import { CookTonightSwiper } from "./CookTonightSwiper";
import { MyRecipesGrid } from "./MyRecipesGrid";
import { NutritionSnapshotCard } from "./NutritionSnapshotCard";
import { useToast } from "./ToastProvider";
import { COOK_TONIGHT_FILTERS } from "@/lib/cookTonightFilters";
import type { FolderDto, RecipeDto } from "@/lib/types";

const STATUS_MESSAGES = [
  "Reading the caption and hashtags…",
  "Working out ingredients and steps…",
  "Estimating time, difficulty, and cost…",
];

export function RecipeLibrary({
  initialRecipes,
  initialFolders,
  loadError,
  collectionImportEnabled = false,
  showThisWeekCard = true,
}: {
  initialRecipes: RecipeDto[];
  initialFolders: FolderDto[];
  loadError?: string | null;
  collectionImportEnabled?: boolean;
  showThisWeekCard?: boolean;
}) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<{ message: string; existingRecipeId?: string } | null>(null);
  const [activeCookTonightFilters, setActiveCookTonightFilters] = useState<Set<string>>(new Set());
  const [showSwiper, setShowSwiper] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const showToast = useToast();

  function handleOpenSwiper() {
    if (recipes.length < 2) {
      showToast("Save at least 2 recipes to use the swiper 🌸");
      return;
    }
    setShowSwiper(true);
  }

  useEffect(() => {
    if (!submitting) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setStatusIndex((i) => Math.min(i + 1, STATUS_MESSAGES.length - 1));
    }, 4000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [submitting]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || submitting) return;

    setSubmitting(true);
    setStatusIndex(0);
    setError(null);

    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), notes: notes.trim() || undefined }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError({ message: data.error ?? "Something went wrong.", existingRecipeId: data.recipeId });
        return;
      }

      setRecipes((prev) => [data.recipe as RecipeDto, ...prev]);
      setUrl("");
      setNotes("");
      setShowNotes(false);
      showToast("Saved to your box 💕");
    } catch {
      setError({ message: "Couldn't reach the server. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  function toggleCookTonightFilter(value: string) {
    setActiveCookTonightFilters((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  return (
    <div className="page-fade-in mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6">
      <header className="relative isolate overflow-hidden px-2 pt-6 pb-2 text-center sm:pt-10">
        <svg
          aria-hidden
          viewBox="0 0 200 200"
          className="pointer-events-none absolute -top-16 -right-16 -z-10 h-64 w-64 opacity-60 blur-2xl sm:-top-24 sm:-right-24 sm:h-96 sm:w-96"
        >
          <defs>
            <linearGradient id="heroBlobGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbe4e9" />
              <stop offset="100%" stopColor="#e6e0f7" />
            </linearGradient>
          </defs>
          <path
            fill="url(#heroBlobGradient)"
            d="M45.3,-58.5C58.6,-49.6,68.8,-35.3,72.4,-19.7C76,-4,73,12.9,65.6,27.4C58.1,41.9,46.2,54,32,61.9C17.8,69.8,1.3,73.5,-15.4,71.8C-32.1,70.1,-49,63,-60.6,50.5C-72.2,38,-78.5,20.1,-78.4,2.3C-78.3,-15.5,-71.8,-33.2,-60.1,-42.9C-48.4,-52.6,-31.5,-54.3,-16.1,-59.5C-0.7,-64.7,15.2,-73.4,29.9,-71.3C44.6,-69.2,58.1,-56.3,45.3,-58.5Z"
            transform="translate(100 100)"
          />
        </svg>

        <span
          aria-hidden
          className="floaty pointer-events-none absolute top-[10%] left-[1%] hidden text-3xl opacity-70 select-none sm:block sm:text-4xl"
        >
          🌸
        </span>
        <span
          aria-hidden
          className="floaty-fast pointer-events-none absolute top-[4%] right-[2%] hidden text-2xl opacity-60 select-none sm:block sm:text-3xl"
        >
          ✨
        </span>
        <span
          aria-hidden
          className="floaty-slow pointer-events-none absolute bottom-[8%] left-[6%] hidden text-3xl opacity-60 select-none sm:block sm:text-4xl"
        >
          🍋
        </span>
        <span
          aria-hidden
          className="floaty floaty-delay pointer-events-none absolute right-[5%] bottom-[4%] hidden text-2xl opacity-70 select-none sm:block sm:text-3xl"
        >
          🫶
        </span>

        <div className="relative mx-auto flex max-w-xl flex-col items-center gap-3">
          <h1 className="font-serif text-4xl font-semibold text-rose-deep sm:text-5xl">
            What&apos;s cooking, bestie?
          </h1>
          <p className="text-sm text-foreground/70 sm:text-base">From FYP to your kitchen ✨</p>
        </div>
      </header>

      {loadError && (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {loadError}
        </p>
      )}

      <form
        id="add-recipe"
        onSubmit={handleSubmit}
        className="relative z-10 mx-auto flex w-full max-w-2xl scroll-mt-24 flex-col gap-3 rounded-[2rem] border border-blush-dark/50 bg-white/85 p-4 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)] backdrop-blur-sm sm:p-5"
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="add-recipe-input"
            type="url"
            required
            inputMode="url"
            placeholder="https://www.tiktok.com/@user/video/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={submitting}
            className="flex-1 rounded-full border border-blush-dark/60 bg-white px-5 py-3 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/30 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={submitting || !url.trim()}
            className="shine-on-hover inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {submitting ? "Analyzing…" : "Break it down ✨"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowNotes((v) => !v)}
          className="self-start text-xs font-medium text-dusty-rose underline-offset-2 hover:underline"
        >
          {showNotes ? "Hide notes" : "Add notes (e.g. ingredients you spotted on screen)"}
        </button>
        {showNotes && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            placeholder="Anything the video didn't say out loud — on-screen ingredient lists, substitutions, etc."
            rows={3}
            className="rounded-2xl border border-blush-dark/60 bg-white px-4 py-2.5 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/30 disabled:opacity-60"
          />
        )}

        {submitting && (
          <div className="flex flex-col gap-2">
            <p className="flex items-center gap-2 text-sm text-dusty-rose">
              <Loader2 size={14} className="animate-spin" />
              {STATUS_MESSAGES[statusIndex]}
            </p>
            <div className="flex gap-3 overflow-hidden">
              <div className="h-24 w-20 shrink-0 rounded-2xl skeleton-shimmer" />
              <div className="flex flex-1 flex-col gap-2 py-1">
                <div className="h-3 w-3/4 rounded-full skeleton-shimmer" />
                <div className="h-3 w-1/2 rounded-full skeleton-shimmer" />
                <div className="h-3 w-2/3 rounded-full skeleton-shimmer" />
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-coral-deep">
            {error.message}{" "}
            {error.existingRecipeId && (
              <Link href={`/recipes/${error.existingRecipeId}`} className="font-semibold underline">
                View it
              </Link>
            )}
          </p>
        )}
      </form>

      {collectionImportEnabled && (
        <CollectionImport
          onImported={(recipe) =>
            setRecipes((prev) => (prev.some((r) => r.id === recipe.id) ? prev : [recipe, ...prev]))
          }
        />
      )}

      <section className="flex flex-col items-center gap-3 rounded-[1.75rem] bg-gradient-to-r from-blush to-lavender/40 px-5 py-6 text-center">
        <div>
          <p className="font-serif text-lg font-semibold text-rose-deep">Feeling indecisive? 🎀</p>
          <p className="text-xs text-dusty-rose">Swipe through your saved recipes to find tonight&apos;s pick.</p>
        </div>
        <button
          type="button"
          onClick={handleOpenSwiper}
          className="shrink-0 rounded-full bg-gradient-to-r from-coral to-rose-deep px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
        >
          Cook Tonight? 🌙
        </button>
      </section>

      {showThisWeekCard && <NutritionSnapshotCard />}

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-xl font-semibold text-rose-deep">Cook something tonight? 🌙</h2>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {COOK_TONIGHT_FILTERS.map((filter) => {
            const active = activeCookTonightFilters.has(filter.value);
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => toggleCookTonightFilter(filter.value)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  active
                    ? "bg-gradient-to-r from-coral to-rose-deep text-white shadow-md"
                    : "bg-blush text-rose-deep shadow-[0_2px_6px_-1px_rgba(192,120,140,0.35)] hover:-translate-y-0.5 hover:bg-blush-dark hover:shadow-[0_4px_10px_-1px_rgba(192,120,140,0.45)]"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-dusty-rose">Tap a pill to filter Your Recipes below ✨</p>
      </section>

      <section id="recipes" className="scroll-mt-24">
        <MyRecipesGrid
          recipes={recipes}
          initialFolders={initialFolders}
          cookTonightFilters={activeCookTonightFilters}
        />
      </section>

      {showSwiper && <CookTonightSwiper recipes={recipes} onClose={() => setShowSwiper(false)} />}
    </div>
  );
}
