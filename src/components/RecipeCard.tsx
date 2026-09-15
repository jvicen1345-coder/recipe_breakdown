"use client";

import { useState } from "react";
import Link from "next/link";
import { ChefHat, Clock3, DollarSign, Utensils } from "lucide-react";

import { Badge } from "./Badge";
import { CookMode } from "./CookMode";
import { FavoriteButton } from "./FavoriteButton";
import { usePantry } from "./PantryProvider";
import { usePlan } from "./PlanProvider";
import { useProUpsell } from "./ProUpsellProvider";
import { RecipeThumbnail } from "./RecipeThumbnail";
import { useRecipeModal } from "./RecipeModalProvider";
import { useToast } from "./ToastProvider";
import { addRecipeToGroceryList } from "@/lib/groceryListStorage";
import { pantryMatchCount } from "@/lib/pantryMatch";
import {
  DIET_STYLES,
  DIET_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_STYLES,
  MEAL_TYPE_LABELS,
  MEAL_TYPE_STYLES,
  PROTEIN_LABELS,
  TIME_BADGE_STYLE,
  formatMinutes,
  formatPriceUsd,
} from "@/lib/format";
import type { RecipeDto } from "@/lib/types";

export function RecipeCard({
  recipe,
  showQuickActions = false,
}: {
  recipe: RecipeDto;
  /** Hover overlay with "View Recipe" / "Add to List" — used on the My Recipes grid. */
  showQuickActions?: boolean;
}) {
  const price = formatPriceUsd(recipe.estimatedPriceUsd);
  const openRecipe = useRecipeModal();
  const showToast = useToast();
  const { names: pantryNames } = usePantry();
  const { pantryOnboardedAt, stalenessLevel, isPro } = usePlan();
  const openUpsell = useProUpsell();
  const [showCookMode, setShowCookMode] = useState(false);
  const pantryCount = pantryMatchCount(recipe.ingredients, pantryNames);
  const pantryStale = Boolean(pantryOnboardedAt) && (stalenessLevel === "banner" || stalenessLevel === "block");

  function handleAddToList(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addRecipeToGroceryList(recipe.id, recipe.ingredients.length);
    showToast("Added to grocery list 🛒");
  }

  function handleCook(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isPro) {
      openUpsell("cook-mode");
      return;
    }
    setShowCookMode(true);
  }

  return (
    <>
    <Link
      href={`/recipes/${recipe.id}`}
      onClick={(e) => {
        e.preventDefault();
        openRecipe(recipe);
      }}
      className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white/75 shadow-[0_10px_30px_-14px_rgba(192,120,140,0.45)] ring-1 ring-blush-dark/50 backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-[0_18px_44px_-16px_rgba(192,120,140,0.55)]"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-3xl bg-blush-soft">
        <RecipeThumbnail
          src={recipe.thumbnailUrl}
          alt={recipe.title}
          className="h-full w-full transition duration-300 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0" />

        {showQuickActions && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 transition group-hover:pointer-events-auto group-hover:opacity-100">
            <button
              type="button"
              onClick={handleCook}
              className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-rose-deep shadow-sm transition hover:bg-white"
            >
              Cook 🍳
            </button>
            <button
              type="button"
              onClick={handleAddToList}
              className="rounded-full bg-sage px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-sage-dark"
            >
              Add to list 🛒
            </button>
          </div>
        )}

        <FavoriteButton recipeId={recipe.id} className="absolute top-2.5 right-2.5 z-10" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <h3 className="font-serif line-clamp-2 text-base leading-snug font-semibold text-rose-deep sm:text-lg">
          {recipe.title}
        </h3>
        {recipe.authorHandle && (
          <p className="text-xs text-dusty-rose">@{recipe.authorHandle}</p>
        )}
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {recipe.difficulty && (
            <Badge
              className={DIFFICULTY_STYLES[recipe.difficulty]}
              icon={<ChefHat size={12} />}
            >
              {DIFFICULTY_LABELS[recipe.difficulty]}
            </Badge>
          )}
          {recipe.totalTimeMinutes != null && (
            <Badge className={TIME_BADGE_STYLE} icon={<Clock3 size={12} />}>
              {formatMinutes(recipe.totalTimeMinutes)}
            </Badge>
          )}
          {price && <Badge icon={<DollarSign size={12} />}>{price}</Badge>}
          {recipe.mealType && (
            <Badge className={MEAL_TYPE_STYLES[recipe.mealType]} icon={<Utensils size={12} />}>
              {MEAL_TYPE_LABELS[recipe.mealType]}
            </Badge>
          )}
          {recipe.dietType && (
            <Badge className={DIET_STYLES[recipe.dietType]}>{DIET_LABELS[recipe.dietType]}</Badge>
          )}
          {recipe.proteinType && recipe.proteinType !== "none" && recipe.dietType === "omnivore" && (
            <Badge>{PROTEIN_LABELS[recipe.proteinType]}</Badge>
          )}
          {pantryNames.length > 0 &&
            (pantryStale ? (
              <Badge wrap className="bg-amber-100 text-amber-800">⚠️ Pantry match may be outdated</Badge>
            ) : (
              <Badge wrap className="bg-sage/25 text-sage-dark">
                🧺 You have {pantryCount.have}/{pantryCount.total} ingredients ✓
              </Badge>
            ))}
        </div>
      </div>
    </Link>
    {showCookMode && <CookMode recipe={recipe} onClose={() => setShowCookMode(false)} />}
    </>
  );
}
