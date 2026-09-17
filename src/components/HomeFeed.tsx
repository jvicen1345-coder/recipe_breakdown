"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3, Loader2, Sparkles } from "lucide-react";

import { CollectionImport } from "./CollectionImport";
import { CookMode } from "./CookMode";
import { CookTonightSwiper } from "./CookTonightSwiper";
import { GirlDinnerMode } from "./GirlDinnerMode";
import { NutritionSnapshotCard } from "./NutritionSnapshotCard";
import { ProLockBadge } from "./ProLockBadge";
import { useProUpsell } from "./ProUpsellProvider";
import { RecipeCard } from "./RecipeCard";
import { RecipeThumbnail } from "./RecipeThumbnail";
import { useRecipeModal } from "./RecipeModalProvider";
import { useToast } from "./ToastProvider";
import { getMostRecentCookProgress } from "@/lib/cookModeStorage";
import { COOK_TONIGHT_FILTERS, matchesCookTonightFilter, matchesGirlDinner } from "@/lib/cookTonightFilters";
import { formatMinutes } from "@/lib/format";
import {
  getGreeting,
  getOverdueGhostHint,
  getTimeBand,
  MACRO_GHOST_HINT,
  MACRO_PILL_LABEL,
  mySavedRecipes,
  pickFavoriteRecipes,
  pickMacroBucket,
  pickMacroRecipe,
  pickOverdueOrNeverCooked,
  pickRecentlyAdded,
  pickTimeBasedRecipe,
  pickTopProteinTag,
  TIME_BAND_GHOST_HINT,
  TIME_BAND_PILL_LABEL,
} from "@/lib/homeFeed";
import type { HomeNutritionCard, RecipeDto } from "@/lib/types";

const STATUS_MESSAGES = [
  "Reading the caption and hashtags…",
  "Working out ingredients and steps…",
  "Estimating time, difficulty, and cost…",
];

const EDITORIAL_PICKS = [
  { emoji: "🍝", title: "Creamy Garlic Pasta", query: "creamy garlic pasta recipe" },
  { emoji: "🍵", title: "5-Minute Iced Matcha", query: "iced matcha recipe" },
  { emoji: "🍗", title: "Crispy Air Fryer Chicken", query: "crispy air fryer chicken recipe" },
];

function HorizontalRow({ recipes, onOpen }: { recipes: RecipeDto[]; onOpen: (r: RecipeDto) => void }) {
  return (
    <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
      {recipes.map((recipe) => (
        <button
          key={recipe.id}
          type="button"
          onClick={() => onOpen(recipe)}
          className="w-36 shrink-0 overflow-hidden rounded-2xl bg-white/75 text-left shadow-[0_8px_24px_-12px_rgba(192,120,140,0.45)] ring-1 ring-blush-dark/40 transition hover:-translate-y-0.5"
        >
          <div className="aspect-[4/5] w-full bg-blush-soft">
            <RecipeThumbnail src={recipe.thumbnailUrl} alt={recipe.title} className="h-full w-full" />
          </div>
          <div className="flex flex-col gap-0.5 p-2.5">
            <p className="line-clamp-2 font-serif text-sm leading-snug font-semibold text-rose-deep">
              {recipe.title}
            </p>
            {recipe.totalTimeMinutes != null && (
              <p className="flex items-center gap-1 text-[11px] text-dusty-rose">
                <Clock3 size={10} /> {formatMinutes(recipe.totalTimeMinutes)}
              </p>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

interface RecommendationEntry {
  key: string;
  recipe: RecipeDto;
  pillLabel: string;
  pillBgClass: string;
}

function RecommendationPill({ label, bgClass }: { label: string; bgClass: string }) {
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium text-rose-deep ${bgClass}`}
    >
      {label}
    </span>
  );
}

function RecommendationCard({ entry }: { entry: RecommendationEntry }) {
  return (
    <div className="flex flex-col gap-1">
      <RecommendationPill label={entry.pillLabel} bgClass={entry.pillBgClass} />
      <RecipeCard recipe={entry.recipe} showQuickActions />
    </div>
  );
}

interface GhostEntry {
  key: string;
  pillLabel: string;
  pillBgClass: string;
  hint: string;
}

function GhostCard({ entry }: { entry: GhostEntry }) {
  return (
    <div className="flex flex-col gap-1">
      <RecommendationPill label={entry.pillLabel} bgClass={`${entry.pillBgClass} opacity-50`} />
      <button
        type="button"
        onClick={() => {
          const el = document.getElementById("add-recipe-input") as HTMLInputElement | null;
          el?.scrollIntoView({ behavior: "smooth", block: "center" });
          el?.focus({ preventScroll: true });
        }}
        className="ghost-shimmer relative flex h-full min-h-[260px] flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed border-blush-dark/40 bg-blush-soft/40 p-5 text-center transition hover:border-coral/50 hover:bg-blush-soft/60"
      >
        <p className="font-serif text-sm leading-snug text-rose-deep/80 italic">{entry.hint}</p>
      </button>
    </div>
  );
}

export function HomeFeed({
  initialRecipes,
  loadError,
  showThisWeekCard = true,
  isPro = false,
  currentUserId,
}: {
  initialRecipes: RecipeDto[];
  loadError?: string | null;
  showThisWeekCard?: boolean;
  isPro?: boolean;
  currentUserId: string;
}) {
  const [recipes, setRecipes] = useState(initialRecipes);
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);
  const [error, setError] = useState<{ message: string; existingRecipeId?: string } | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showSwiper, setShowSwiper] = useState(false);
  const [showGirlDinner, setShowGirlDinner] = useState(false);
  const [cookRecipe, setCookRecipe] = useState<RecipeDto | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [continueRecipe, setContinueRecipe] = useState<{ recipe: RecipeDto; stepIndex: number } | null>(null);
  const [nutritionWeek, setNutritionWeek] = useState<HomeNutritionCard | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const showToast = useToast();
  const openUpsell = useProUpsell();
  const openRecipe = useRecipeModal();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads localStorage (favorites/cooked/cook-progress), unavailable during SSR
    setHydrated(true);
    const progress = getMostRecentCookProgress();
    if (progress) {
      const recipe = recipes.find((r) => r.id === progress.recipeId);
      if (recipe) setContinueRecipe({ recipe, stepIndex: progress.stepIndex });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- computed once on mount from localStorage
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/nutrition-home-card")
      .then((res) => res.json())
      .then((d: HomeNutritionCard) => {
        if (!cancelled) setNutritionWeek(d);
      })
      .catch(() => {
        // The macro-pick card is a nice-to-have; skip silently on failure.
      });
    return () => {
      cancelled = true;
    };
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
        if (data.reason === "recipe-limit") {
          openUpsell("recipe-limit");
        } else {
          setError({ message: data.error ?? "Something went wrong.", existingRecipeId: data.recipeId });
        }
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

  function handleOpenSwiper() {
    if (!isPro) {
      openUpsell("recipe-swiper");
      return;
    }
    if (recipes.length < 2) {
      showToast("Save at least 2 recipes to use the swiper 🌸");
      return;
    }
    setShowSwiper(true);
  }

  const saved = mySavedRecipes(recipes, currentUserId);
  const isEmpty = hydrated && saved.length === 0;

  const tagInsight = hydrated ? pickTopProteinTag(saved) : null;
  const favoriteRecipes = hydrated ? pickFavoriteRecipes(recipes) : [];

  const card1Recipe = hydrated ? pickRecentlyAdded(saved) : null;
  const card2Recipe = hydrated ? pickOverdueOrNeverCooked(saved, card1Recipe?.id ?? null) : null;
  const timeBasedPick = hydrated
    ? pickTimeBasedRecipe(saved, [card1Recipe?.id, card2Recipe?.id])
    : null;
  const card3Recipe = timeBasedPick?.recipe ?? null;

  const usedIds = new Set([card1Recipe?.id, card2Recipe?.id, card3Recipe?.id].filter((id): id is string => id != null));
  const macroCandidates = hydrated ? saved.filter((r) => !usedIds.has(r.id)) : [];
  const macroBucket = nutritionWeek
    ? pickMacroBucket(nutritionWeek.weekMacroPct, nutritionWeek.totals.calories / 7, nutritionWeek.hasCookedThisWeek)
    : "no-data";
  const card4Recipe = hydrated && nutritionWeek ? pickMacroRecipe(macroCandidates, macroBucket) : null;

  type GridSlot = { type: "real"; entry: RecommendationEntry } | { type: "ghost"; entry: GhostEntry };
  const gridSlots: GridSlot[] = [];

  if (card1Recipe) {
    gridSlots.push({
      type: "real",
      entry: { key: "recent", recipe: card1Recipe, pillLabel: "New Save ✨", pillBgClass: "bg-blush" },
    });
  }

  if (card2Recipe) {
    gridSlots.push({
      type: "real",
      entry: { key: "overdue", recipe: card2Recipe, pillLabel: "Make it again 👀", pillBgClass: "bg-lavender" },
    });
  } else if (hydrated) {
    gridSlots.push({
      type: "ghost",
      entry: {
        key: "overdue-ghost",
        pillLabel: "Make it again 👀",
        pillBgClass: "bg-lavender",
        hint: getOverdueGhostHint(saved.length),
      },
    });
  }

  if (card3Recipe && timeBasedPick) {
    gridSlots.push({
      type: "real",
      entry: {
        key: "timebased",
        recipe: card3Recipe,
        pillLabel: TIME_BAND_PILL_LABEL[timeBasedPick.band],
        pillBgClass: "bg-peach",
      },
    });
  } else if (hydrated) {
    const band = getTimeBand();
    gridSlots.push({
      type: "ghost",
      entry: {
        key: "timebased-ghost",
        pillLabel: TIME_BAND_PILL_LABEL[band],
        pillBgClass: "bg-peach",
        hint: TIME_BAND_GHOST_HINT[band],
      },
    });
  }

  if (card4Recipe) {
    gridSlots.push({
      type: "real",
      entry: { key: "macro", recipe: card4Recipe, pillLabel: MACRO_PILL_LABEL[macroBucket], pillBgClass: "bg-coral/25" },
    });
  } else if (hydrated) {
    gridSlots.push({
      type: "ghost",
      entry: {
        key: "macro-ghost",
        pillLabel: MACRO_PILL_LABEL[macroBucket],
        pillBgClass: "bg-coral/25",
        hint: MACRO_GHOST_HINT[macroBucket],
      },
    });
  }

  const activeFilterMatches =
    hydrated && activeFilter ? saved.filter((r) => matchesCookTonightFilter(r, activeFilter)) : [];
  const activeFilterMeta = COOK_TONIGHT_FILTERS.find((f) => f.value === activeFilter);

  let delayIndex = 0;
  const nextDelay = () => `${delayIndex++ * 50}ms`;

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

        <div className="relative mx-auto flex max-w-xl flex-col items-center gap-3">
          <h1 className="font-serif text-4xl font-semibold text-rose-deep sm:text-5xl">
            What&apos;s cooking, bestie? 🍓
          </h1>
          <p className="text-sm text-foreground/70 sm:text-base">From FYP to your kitchen ✨</p>
        </div>

        <div
          aria-hidden
          className="relative z-10 mx-auto mt-6 flex w-full max-w-[15rem] items-center justify-between select-none sm:max-w-xs"
        >
          <span className="floaty-x text-2xl opacity-70 sm:text-3xl">🌸</span>
          <span className="floaty-x-fast floaty-delay text-xl opacity-60 sm:text-2xl">✨</span>
          <span className="floaty-x-slow text-2xl opacity-60 sm:text-3xl">🍋</span>
          <span className="floaty-x floaty-delay text-xl opacity-70 sm:text-2xl">🫶</span>
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

      <CollectionImport
        onImported={(recipe) =>
          setRecipes((prev) => (prev.some((r) => r.id === recipe.id) ? prev : [recipe, ...prev]))
        }
      />

      {isEmpty ? (
        <>
          <div
            className="card-fade-in rounded-[1.75rem] bg-gradient-to-r from-blush to-lavender/40 px-6 py-8 text-center"
            style={{ animationDelay: nextDelay() }}
          >
            <p className="font-serif text-lg font-semibold text-rose-deep">
              Your personalised feed will build as you save recipes ✨
            </p>
            <p className="mt-1 text-sm text-dusty-rose">Paste your first TikTok link above to get started 🌸</p>
          </div>

          <section className="card-fade-in flex flex-col gap-3" style={{ animationDelay: nextDelay() }}>
            <h2 className="font-serif text-xl font-semibold text-rose-deep">Our picks to get you started 🎀</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {EDITORIAL_PICKS.map((pick) => (
                <a
                  key={pick.title}
                  href={`https://www.tiktok.com/search?q=${encodeURIComponent(pick.query)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col items-center gap-2 rounded-3xl bg-white/75 p-6 text-center shadow-[0_10px_30px_-14px_rgba(192,120,140,0.45)] ring-1 ring-blush-dark/50 transition hover:-translate-y-1"
                >
                  <span className="text-4xl">{pick.emoji}</span>
                  <p className="font-serif text-base font-semibold text-rose-deep">{pick.title}</p>
                  <p className="text-xs text-dusty-rose">Find it on TikTok →</p>
                </a>
              ))}
            </div>
          </section>
        </>
      ) : (
        hydrated && (
          <>
            <section className="card-fade-in flex flex-col gap-4" style={{ animationDelay: nextDelay() }}>
              <h2 className="font-serif text-2xl font-semibold text-rose-deep">{getGreeting()} 👋</h2>

              {gridSlots.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {gridSlots.map((slot) =>
                    slot.type === "real" ? (
                      <RecommendationCard key={slot.entry.key} entry={slot.entry} />
                    ) : (
                      <GhostCard key={slot.entry.key} entry={slot.entry} />
                    ),
                  )}
                </div>
              )}
            </section>

            {continueRecipe && (
              <section className="card-fade-in" style={{ animationDelay: nextDelay() }}>
                <h2 className="mb-3 font-serif text-xl font-semibold text-rose-deep">Pick up where you left off 🔖</h2>
                <button
                  type="button"
                  onClick={() => setCookRecipe(continueRecipe.recipe)}
                  className="flex w-full items-center gap-4 rounded-[1.75rem] bg-white/75 p-4 text-left shadow-[0_10px_30px_-14px_rgba(192,120,140,0.45)] ring-1 ring-blush-dark/50 backdrop-blur-sm transition hover:-translate-y-0.5"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-blush-soft">
                    <RecipeThumbnail
                      src={continueRecipe.recipe.thumbnailUrl}
                      alt={continueRecipe.recipe.title}
                      className="h-full w-full"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-base font-semibold text-rose-deep">
                      {continueRecipe.recipe.title}
                    </p>
                    <p className="text-sm font-medium text-coral-deep">
                      Step {continueRecipe.stepIndex + 1} of {continueRecipe.recipe.instructions.length} — continue
                      cooking →
                    </p>
                  </div>
                </button>
              </section>
            )}

            <section className="card-fade-in grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2" style={{ animationDelay: nextDelay() }}>
              <div className="flex h-full flex-col gap-3 rounded-[1.75rem] bg-gradient-to-br from-blush to-lavender/40 p-5">
                <div className="flex items-center justify-center gap-1.5 text-center">
                  <p className="font-serif text-lg font-semibold text-rose-deep">Feeling indecisive? 🎀</p>
                  {!isPro && <ProLockBadge reason="recipe-swiper" />}
                </div>
                <p className="-mt-1 text-center text-xs text-dusty-rose">Pick your vibe for tonight:</p>

                <div className="mt-1 flex flex-1 flex-col justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenSwiper}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
                  >
                    💘 Find Your Match
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowGirlDinner(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral-deep to-peach-dark px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
                  >
                    🍓 Girl Dinner
                  </button>
                </div>
              </div>

              {showThisWeekCard && <NutritionSnapshotCard onStartCooking={() => setShowSwiper(true)} />}
            </section>

            <Link
              href="/community"
              className="card-fade-in flex items-center gap-4 rounded-[1.75rem] bg-gradient-to-r from-lavender/50 to-blush p-5 shadow-[0_10px_30px_-14px_rgba(192,120,140,0.45)] ring-1 ring-blush-dark/40 transition hover:-translate-y-0.5"
              style={{ animationDelay: nextDelay() }}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/70 text-coral-deep">
                <Sparkles size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-serif text-base font-semibold text-rose-deep">See what the community&apos;s cooking</p>
                <p className="text-xs text-dusty-rose">Real photos, real ratings 🌸</p>
              </div>
              <ArrowRight size={18} className="shrink-0 text-dusty-rose" />
            </Link>

            <section className="card-fade-in flex flex-col gap-3" style={{ animationDelay: nextDelay() }}>
              <h2 className="text-sm font-semibold text-dusty-rose">Or browse by vibe ⚡</h2>
              <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                {COOK_TONIGHT_FILTERS.map((filter) => {
                  const active = activeFilter === filter.value;
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setActiveFilter((prev) => (prev === filter.value ? null : filter.value))}
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

              {activeFilterMeta && activeFilterMatches.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-dusty-rose">
                    Your {activeFilterMeta.label.toLowerCase()} saves {activeFilterMeta.value === "vegan" ? "🌱" : "⚡"}
                  </p>
                  <HorizontalRow recipes={activeFilterMatches} onOpen={openRecipe} />
                </div>
              )}
            </section>

            {tagInsight && (
              <section className="card-fade-in flex flex-col gap-3" style={{ animationDelay: nextDelay() }}>
                <h2 className="font-serif text-xl font-semibold text-rose-deep">
                  Because you love {tagInsight.label} {tagInsight.emoji}
                </h2>
                <p className="-mt-2 text-xs text-dusty-rose">Because you keep saving {tagInsight.label} dishes</p>
                <HorizontalRow recipes={tagInsight.recipes} onOpen={openRecipe} />
              </section>
            )}

            {favoriteRecipes.length > 0 && (
              <section className="card-fade-in flex flex-col gap-3" style={{ animationDelay: nextDelay() }}>
                <h2 className="font-serif text-xl font-semibold text-rose-deep">Your favourites 💕</h2>
                <p className="-mt-2 text-xs text-dusty-rose">Your most loved saves</p>
                <HorizontalRow recipes={favoriteRecipes} onOpen={openRecipe} />
              </section>
            )}
          </>
        )
      )}

      <p className="pt-2 pb-4 text-center text-[11px] text-dusty-rose/70">
        Powered by the same software as{" "}
        <a
          href="https://limbic.center/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-dusty-rose"
        >
          Limbic Center
        </a>
      </p>

      {showSwiper && <CookTonightSwiper recipes={recipes} onClose={() => setShowSwiper(false)} />}
      {showGirlDinner && (
        <GirlDinnerMode recipes={recipes.filter(matchesGirlDinner)} onClose={() => setShowGirlDinner(false)} />
      )}
      {cookRecipe && <CookMode recipe={cookRecipe} onClose={() => setCookRecipe(null)} />}
    </div>
  );
}
