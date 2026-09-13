import Link from "next/link";
import { Clock3, ChefHat, DollarSign } from "lucide-react";

import { Badge } from "./Badge";
import { FavoriteButton } from "./FavoriteButton";
import { RecipeThumbnail } from "./RecipeThumbnail";
import {
  DIET_STYLES,
  DIET_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_STYLES,
  PROTEIN_LABELS,
  TIME_BADGE_STYLE,
  formatMinutes,
  formatPriceUsd,
} from "@/lib/format";
import type { RecipeDto } from "@/lib/types";

export function RecipeCard({ recipe }: { recipe: RecipeDto }) {
  const price = formatPriceUsd(recipe.estimatedPriceUsd);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl bg-white/75 shadow-[0_10px_30px_-14px_rgba(192,120,140,0.45)] ring-1 ring-blush-dark/50 backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-[0_18px_44px_-16px_rgba(192,120,140,0.55)]"
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-3xl bg-blush-soft">
        <RecipeThumbnail
          src={recipe.thumbnailUrl}
          alt={recipe.title}
          className="h-full w-full transition duration-300 group-hover:scale-105"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-black/0" />
        <FavoriteButton recipeId={recipe.id} className="absolute top-2.5 right-2.5" />
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
          {recipe.dietType && (
            <Badge className={DIET_STYLES[recipe.dietType]}>{DIET_LABELS[recipe.dietType]}</Badge>
          )}
          {recipe.proteinType && recipe.proteinType !== "none" && recipe.dietType === "omnivore" && (
            <Badge>{PROTEIN_LABELS[recipe.proteinType]}</Badge>
          )}
        </div>
      </div>
    </Link>
  );
}
