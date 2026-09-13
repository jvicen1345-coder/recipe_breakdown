"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Search } from "lucide-react";

import { CollectionImport } from "./CollectionImport";
import { RecipeCard } from "./RecipeCard";
import { DIET_LABELS } from "@/lib/format";
import type { RecipeDto } from "@/lib/types";

const DIET_FILTER_OPTIONS = Object.entries(DIET_LABELS);

const STATUS_MESSAGES = [
  "Reading the caption and hashtags…",
  "Working out ingredients and steps…",
  "Estimating time, difficulty, and cost…",
];

const TRENDING_PLACEHOLDERS = [
  { title: "Baked Feta Pasta", handle: "noodlesandnoise", emoji: "🍝" },
  { title: "Crumbl-Style Cookies", handle: "sweettreatsxo", emoji: "🍪" },
  { title: "Green Goddess Bowl", handle: "cleangirl.eats", emoji: "🥗" },
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
  const [search, setSearch] = useState("");
  const [dietFilter, setDietFilter] = useState("all");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<{ message: string; existingRecipeId?: string } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    return recipes.filter((recipe) => {
      const matchesSearch =
        !query ||
        recipe.title.toLowerCase().includes(query) ||
        recipe.authorHandle?.toLowerCase().includes(query);
      const matchesDiet = dietFilter === "all" || recipe.dietType === dietFilter;
      return matchesSearch && matchesDiet;
    });
  }, [recipes, search, dietFilter]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6">
      <header className="relative isolate overflow-hidden px-2 pt-6 pb-2 text-center sm:pt-10">
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
        onSubmit={handleSubmit}
        className="relative z-10 mx-auto flex w-full max-w-2xl flex-col gap-3 rounded-[2rem] border border-blush-dark/50 bg-white/85 p-4 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)] backdrop-blur-sm sm:p-5"
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
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
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
          <p className="flex items-center gap-2 text-sm text-dusty-rose">
            <Loader2 size={14} className="animate-spin" />
            {STATUS_MESSAGES[statusIndex]}
          </p>
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

      <section className="flex flex-col gap-3">
        <h2 className="font-serif text-xl font-semibold text-rose-deep">Trending on TikTok 🔥</h2>
        <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
          {TRENDING_PLACEHOLDERS.map((item) => (
            <div
              key={item.title}
              className="flex w-44 shrink-0 flex-col overflow-hidden rounded-3xl bg-white/70 shadow-[0_10px_28px_-16px_rgba(192,120,140,0.4)] ring-1 ring-blush-dark/40 sm:w-52"
            >
              <div className="flex aspect-[4/5] w-full items-center justify-center bg-gradient-to-br from-blush to-peach text-4xl">
                {item.emoji}
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
        <p className="text-xs text-dusty-rose/80">Inspiration for now — paste a link above to save your own ✨</p>
      </section>

      {recipes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-blush-dark p-12 text-center text-dusty-rose">
          No recipes saved yet — paste a TikTok link above to get started.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl font-semibold text-rose-deep">Your Recipes</h2>
            <span className="text-xs text-dusty-rose">{recipes.length} saved</span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-dusty-rose"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your recipes…"
                className="w-full rounded-full border border-blush-dark/60 bg-white py-2.5 pr-4 pl-10 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
              />
            </div>
            <select
              value={dietFilter}
              onChange={(e) => setDietFilter(e.target.value)}
              className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
            >
              <option value="all">All diets</option>
              {DIET_FILTER_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {filteredRecipes.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-blush-dark p-12 text-center text-dusty-rose">
              No recipes match your search/filter.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {filteredRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
