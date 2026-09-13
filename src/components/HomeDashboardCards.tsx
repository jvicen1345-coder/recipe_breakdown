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

interface NeglectedProtein {
  type: (typeof PROTEIN_TYPES_FOR_INSIGHT)[number];
  neverAdded: boolean;
}

function computeNeglectedProtein(recipes: RecipeDto[]): NeglectedProtein | null {
  if (recipes.length === 0) return null;
  let worst: (NeglectedProtein & { lastAdded: number }) | null = null;
  for (const type of PROTEIN_TYPES_FOR_INSIGHT) {
    const matching = recipes.filter((r) => r.proteinType === type);
    const lastAdded =
      matching.length > 0 ? Math.max(...matching.map((r) => new Date(r.createdAt).getTime())) : -Infinity;
    if (!worst || lastAdded < worst.lastAdded) {
      worst = { type, lastAdded, neverAdded: matching.length === 0 };
    }
  }
  return worst;
}

function articleFor(label: string): string {
  return /^[aeiou]/i.test(label) ? "an" : "a";
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

  const recentlyAdded = recipes[0] ?? null;
  const insight = useMemo(() => computeNeglectedProtein(recipes), [recipes]);

  if (recipes.length === 0) return null;

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <DashboardRecipeCard
        label="Recently Added"
        emoji="🆕"
        recipe={recentlyAdded}
        onOpen={openRecipe}
        emptyText="Nothing saved yet"
      />
      <DashboardRecipeCard
        label="Haven't Made in a While"
        emoji="⏳"
        recipe={neglectedRecipe}
        onOpen={openRecipe}
        emptyText="—"
      />
      <DashboardRecipeCard
        label="Trending for You"
        emoji="💖"
        recipe={favoriteRecipe}
        onOpen={openRecipe}
        emptyText="Heart a recipe to see it here"
      />
      <div className="flex flex-col justify-between gap-2 rounded-3xl bg-gradient-to-br from-blush to-peach p-3 shadow-[0_10px_28px_-16px_rgba(192,120,140,0.4)] ring-1 ring-blush-dark/40">
        <span className="text-xs font-medium tracking-wide text-dusty-rose uppercase">🍽️ For You</span>
        <p className="font-serif text-sm leading-snug font-semibold text-rose-deep">
          {insight
            ? `You haven't added ${articleFor(PROTEIN_LABELS[insight.type])} ${PROTEIN_LABELS[insight.type]} meal ${
                insight.neverAdded ? "yet" : "in a while"
              }!`
            : "Save a few recipes to see meal insights here."}
        </p>
      </div>
    </section>
  );
}

function DashboardRecipeCard({
  label,
  emoji,
  recipe,
  onOpen,
  emptyText,
}: {
  label: string;
  emoji: string;
  recipe: RecipeDto | null;
  onOpen: (recipe: RecipeDto) => void;
  emptyText: string;
}) {
  return (
    <button
      type="button"
      onClick={() => recipe && onOpen(recipe)}
      disabled={!recipe}
      className="flex flex-col gap-2 rounded-3xl bg-white/75 p-3 text-left shadow-[0_10px_28px_-16px_rgba(192,120,140,0.4)] ring-1 ring-blush-dark/40 transition hover:-translate-y-0.5 disabled:cursor-default disabled:hover:translate-y-0"
    >
      <span className="text-xs font-medium tracking-wide text-dusty-rose uppercase">
        {emoji} {label}
      </span>
      {recipe ? (
        <div className="flex items-center gap-2">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-blush-soft">
            <RecipeThumbnail src={recipe.thumbnailUrl} alt={recipe.title} className="h-full w-full" />
          </div>
          <p className="font-serif line-clamp-2 text-sm font-semibold text-rose-deep">{recipe.title}</p>
        </div>
      ) : (
        <p className="text-xs text-dusty-rose">{emptyText}</p>
      )}
    </button>
  );
}
