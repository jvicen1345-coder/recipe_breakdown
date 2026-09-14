"use client";

import { useEffect, useMemo, useState } from "react";

import { RecipeThumbnail } from "./RecipeThumbnail";
import { useRecipeModal } from "./RecipeModalProvider";
import { getAllCookedTimestamps, getFavoriteIds } from "@/lib/clientState";
import { PROTEIN_LABELS } from "@/lib/format";
import type { RecipeDto } from "@/lib/types";

const PROTEIN_TYPES_FOR_INSIGHT = [
  "chicken",
  "beef",
  "pork",
  "seafood",
  "egg",
  "plant-based",
  "other",
] as const;

const HAVENT_MADE_MIN_RECIPES = 3;
const INSIGHT_MIN_IDENTIFIABLE_PROTEINS = 2;

interface NeglectedProtein {
  type: (typeof PROTEIN_TYPES_FOR_INSIGHT)[number];
}

function computeNeglectedProtein(recipes: RecipeDto[]): NeglectedProtein | null {
  const identifiable = recipes.filter((r) => r.proteinType && r.proteinType !== "none");
  if (identifiable.length < INSIGHT_MIN_IDENTIFIABLE_PROTEINS) return null;

  let worst: (NeglectedProtein & { lastAdded: number }) | null = null;
  for (const type of PROTEIN_TYPES_FOR_INSIGHT) {
    const matching = identifiable.filter((r) => r.proteinType === type);
    const lastAdded =
      matching.length > 0 ? Math.max(...matching.map((r) => new Date(r.createdAt).getTime())) : -Infinity;
    if (!worst || lastAdded < worst.lastAdded) {
      worst = { type, lastAdded };
    }
  }
  return worst;
}

function articleFor(label: string): string {
  return /^[aeiou]/i.test(label) ? "an" : "a";
}

interface CardSpec {
  key: string;
  label: string;
  emoji: string;
  recipe: RecipeDto;
}

export function HomeDashboardCards({ recipes }: { recipes: RecipeDto[] }) {
  const openRecipe = useRecipeModal();
  const [neglectedRecipe, setNeglectedRecipe] = useState<RecipeDto | null>(null);
  const [favoriteRecipe, setFavoriteRecipe] = useState<RecipeDto | null>(null);

  useEffect(() => {
    const cookedTimestamps = getAllCookedTimestamps();
    const sortedByNeglect = [...recipes].sort((a, b) => {
      const aTime = cookedTimestamps[a.id] ? new Date(cookedTimestamps[a.id]).getTime() : -Infinity;
      const bTime = cookedTimestamps[b.id] ? new Date(cookedTimestamps[b.id]).getTime() : -Infinity;
      if (aTime !== bTime) return aTime - bTime;
      // Tied (usually both never cooked): the one saved longest ago is more overdue.
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from localStorage, unavailable during SSR
    setNeglectedRecipe(sortedByNeglect[0] ?? null);

    const favoriteIds = getFavoriteIds();
    setFavoriteRecipe(recipes.find((r) => favoriteIds.has(r.id)) ?? null);
  }, [recipes]);

  const insight = useMemo(() => computeNeglectedProtein(recipes), [recipes]);

  const recentlyAdded = recipes[0] ?? null;

  // Only-one-recipe rule: never repeat the same recipe across multiple widgets.
  const recipeCards: CardSpec[] = [];
  if (recentlyAdded) {
    recipeCards.push({ key: "recent", label: "Recently Added", emoji: "🆕", recipe: recentlyAdded });
  }
  const shownIds = new Set(recipeCards.map((c) => c.recipe.id));

  if (recipes.length >= HAVENT_MADE_MIN_RECIPES && neglectedRecipe && !shownIds.has(neglectedRecipe.id)) {
    recipeCards.push({ key: "neglected", label: "Haven't Made in a While", emoji: "⏳", recipe: neglectedRecipe });
    shownIds.add(neglectedRecipe.id);
  }

  if (favoriteRecipe && !shownIds.has(favoriteRecipe.id)) {
    recipeCards.push({ key: "favorite", label: "Your Favourites 💕", emoji: "💖", recipe: favoriteRecipe });
    shownIds.add(favoriteRecipe.id);
  }

  const showInsight = insight != null;
  const totalCards = recipeCards.length + (showInsight ? 1 : 0);

  if (totalCards === 0) return null;

  const gridColsClass =
    totalCards === 1
      ? "grid-cols-1"
      : totalCards === 2
        ? "grid-cols-2"
        : totalCards === 3
          ? "grid-cols-2 sm:grid-cols-3"
          : "grid-cols-2 sm:grid-cols-4";

  return (
    <section className={`mx-auto grid w-full gap-3 ${gridColsClass} ${totalCards === 1 ? "max-w-xs" : ""}`}>
      {recipeCards.map((card, i) => (
        <DashboardRecipeCard
          key={card.key}
          label={card.label}
          emoji={card.emoji}
          recipe={card.recipe}
          onOpen={openRecipe}
          delayMs={i * 50}
        />
      ))}
      {showInsight && insight && (
        <div
          className="card-fade-in flex flex-col justify-between gap-2 rounded-3xl bg-gradient-to-br from-blush to-peach p-3 shadow-[0_10px_28px_-16px_rgba(192,120,140,0.4)] ring-1 ring-blush-dark/40"
          style={{ animationDelay: `${recipeCards.length * 50}ms` }}
        >
          <span className="text-xs font-medium tracking-wide text-dusty-rose uppercase">🍽️ For You</span>
          <p className="font-serif text-sm leading-snug font-semibold text-rose-deep">
            Craving something new? Try {articleFor(PROTEIN_LABELS[insight.type])} {PROTEIN_LABELS[insight.type]}{" "}
            recipe next! 🍽️
          </p>
        </div>
      )}
    </section>
  );
}

function DashboardRecipeCard({
  label,
  emoji,
  recipe,
  onOpen,
  delayMs,
}: {
  label: string;
  emoji: string;
  recipe: RecipeDto;
  onOpen: (recipe: RecipeDto) => void;
  delayMs: number;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(recipe)}
      style={{ animationDelay: `${delayMs}ms` }}
      className="card-fade-in flex flex-col gap-2 rounded-3xl bg-white/75 p-3 text-left shadow-[0_10px_28px_-16px_rgba(192,120,140,0.4)] ring-1 ring-blush-dark/40 transition hover:-translate-y-0.5"
    >
      <span className="text-xs font-medium tracking-wide text-dusty-rose uppercase">
        {emoji} {label}
      </span>
      <div className="flex items-center gap-2">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-blush-soft">
          <RecipeThumbnail src={recipe.thumbnailUrl} alt={recipe.title} className="h-full w-full" />
        </div>
        <p className="font-serif line-clamp-2 text-sm font-semibold text-rose-deep">{recipe.title}</p>
      </div>
    </button>
  );
}
