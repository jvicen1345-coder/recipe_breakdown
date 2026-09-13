"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";

import { CollectionImport } from "./CollectionImport";
import { RecipeCard } from "./RecipeCard";
import { getRecentlyViewedIds } from "@/lib/clientState";
import type { RecipeDto } from "@/lib/types";

const STATUS_MESSAGES = [
  "Reading the caption and hashtags…",
  "Working out ingredients and steps…",
  "Estimating time, difficulty, and cost…",
];

const TRENDING_PLACEHOLDERS = [
  {
    title: "Baked Feta Pasta",
    handle: "noodlesandnoise",
    image: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&q=70&auto=format&fit=crop",
    tags: ["quick", "comfort"],
  },
  {
    title: "Crumbl-Style Cookies",
    handle: "sweettreatsxo",
    image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&q=70&auto=format&fit=crop",
    tags: ["comfort"],
  },
  {
    title: "Green Goddess Bowl",
    handle: "cleangirl.eats",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=70&auto=format&fit=crop",
    tags: ["vegan", "high-protein", "budget"],
  },
];

const TRENDING_FILTERS: { value: string; label: string }[] = [
  { value: "quick", label: "Quick (<30 min)" },
  { value: "budget", label: "Budget" },
  { value: "high-protein", label: "High Protein" },
  { value: "vegan", label: "Vegan" },
  { value: "comfort", label: "Comfort Food" },
];

export function RecipeLibrary({
  initialRecipes,
  loadError,
  collectionImportEnabled = false,
}: {
  initialRecipes: RecipeDto[];
  loadError?: string | null;
  collectionImportEnabled?: boolean;
}) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<{ message: string; existingRecipeId?: string } | null>(null);
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>([]);
  const [activeTrendingFilters, setActiveTrendingFilters] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from localStorage, unavailable during SSR
    setRecentlyViewedIds(getRecentlyViewedIds());
  }, []);

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
    } catch {
      setError({ message: "Couldn't reach the server. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const recentlyViewed = useMemo(() => {
    const byId = new Map(recipes.map((r) => [r.id, r]));
    return recentlyViewedIds.map((id) => byId.get(id)).filter((r): r is RecipeDto => Boolean(r));
  }, [recipes, recentlyViewedIds]);

  function toggleTrendingFilter(value: string) {
    setActiveTrendingFilters((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  const visibleTrending = useMemo(() => {
    if (activeTrendingFilters.size === 0) return TRENDING_PLACEHOLDERS;
    return TRENDING_PLACEHOLDERS.filter((item) => item.tags.some((tag) => activeTrendingFilters.has(tag)));
  }, [activeTrendingFilters]);

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
          className="floaty floaty-delay pointer-events-none absolute top-[4%] right-[2%] hidden text-2xl opacity-60 select-none sm:block sm:text-3xl"
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
            What&apos;s cooking, bestie? 🍓
          </h1>
          <p className="max-w-md text-sm text-foreground/70 sm:text-base">
            Save the TikTok recipes you actually want to make. Paste the link and we&apos;ll turn it
            into something you can actually cook.
          </p>
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

      {recentlyViewed.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-serif text-xl font-semibold text-rose-deep">Recently Viewed</h2>
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {recentlyViewed.map((recipe) => (
              <div key={recipe.id} className="w-44 shrink-0 sm:w-52">
                <RecipeCard recipe={recipe} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-xl font-semibold text-rose-deep">Cook something tonight? 🌙</h2>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {TRENDING_FILTERS.map((filter) => {
            const active = activeTrendingFilters.has(filter.value);
            return (
              <button
                key={filter.value}
                type="button"
                onClick={() => toggleTrendingFilter(filter.value)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  active ? "bg-rose-deep text-white" : "bg-blush text-rose-deep hover:bg-blush-dark"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <h3 className="font-serif text-lg font-semibold text-rose-deep">Trending on TikTok 🔥</h3>
        {visibleTrending.length === 0 ? (
          <p className="text-sm text-dusty-rose">No trending picks match those filters yet.</p>
        ) : (
          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {visibleTrending.map((item) => (
              <div
                key={item.title}
                className="flex w-44 shrink-0 flex-col overflow-hidden rounded-3xl bg-white/70 shadow-[0_10px_28px_-16px_rgba(192,120,140,0.4)] ring-1 ring-blush-dark/40 sm:w-52"
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-blush-soft">
                  {/* eslint-disable-next-line @next/next/no-img-element -- external Unsplash CDN, no domain config needed for a couple of static demo photos */}
                  <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                </div>
                <div className="flex flex-col gap-0.5 p-3">
                  <p className="font-serif truncate text-sm font-semibold text-rose-deep sm:text-base">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-dusty-rose">@{item.handle}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-dusty-rose/80">Inspiration for now — paste a link above to save your own ✨</p>
      </section>
    </div>
  );
}
