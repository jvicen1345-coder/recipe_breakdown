"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";

import { CollectionImport } from "./CollectionImport";
import { RecipeCard } from "./RecipeCard";
import type { RecipeDto } from "@/lib/types";

const STATUS_MESSAGES = [
  "Reading the caption and hashtags…",
  "Working out ingredients and steps…",
  "Estimating time, difficulty, and cost…",
];

export function RecipeLibrary({
  initialRecipes,
  loadError,
}: {
  initialRecipes: RecipeDto[];
  loadError?: string | null;
}) {
  const [recipes, setRecipes] = useState(initialRecipes);
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

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-violet-950 dark:text-violet-50">
          <Sparkles className="text-rose-400" />
          Recipe Breakdown
        </h1>
        <p className="max-w-2xl text-black/80 dark:text-violet-200/70">
          Paste a saved TikTok cooking video and get the recipe: ingredients, steps, make time,
          difficulty, estimated cost, and whether it&apos;s vegan, vegetarian, or built around a
          particular protein.
        </p>
      </header>

      {loadError && (
        <p className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {loadError}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-3xl border border-violet-100 bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-violet-900/50 dark:bg-violet-950/40 sm:p-5"
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
            className="flex-1 rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-200 disabled:opacity-60 dark:border-violet-800 dark:bg-violet-950 dark:focus:ring-rose-900"
          />
          <button
            type="submit"
            disabled={submitting || !url.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-300 px-5 py-2.5 text-sm font-semibold text-rose-950 transition hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
            {submitting ? "Analyzing…" : "Break it down"}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowNotes((v) => !v)}
          className="self-start text-xs font-medium text-violet-500 underline-offset-2 hover:underline dark:text-violet-400"
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
            className="rounded-xl border border-violet-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-200 disabled:opacity-60 dark:border-violet-800 dark:bg-violet-950 dark:focus:ring-rose-900"
          />
        )}

        {submitting && (
          <p className="flex items-center gap-2 text-sm text-violet-500 dark:text-violet-400">
            <Loader2 size={14} className="animate-spin" />
            {STATUS_MESSAGES[statusIndex]}
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            {error.message}{" "}
            {error.existingRecipeId && (
              <Link href={`/recipes/${error.existingRecipeId}`} className="font-semibold underline">
                View it
              </Link>
            )}
          </p>
        )}
      </form>

      <CollectionImport
        onImported={(recipe) =>
          setRecipes((prev) => (prev.some((r) => r.id === recipe.id) ? prev : [recipe, ...prev]))
        }
      />

      {recipes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-violet-200 bg-white/50 p-12 text-center text-violet-500 dark:border-violet-800 dark:bg-violet-950/20 dark:text-violet-400">
          No recipes saved yet — paste a TikTok link above to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
