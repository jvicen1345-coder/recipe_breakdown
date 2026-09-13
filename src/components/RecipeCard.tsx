import Link from "next/link";
import { Clock3, ChefHat, DollarSign } from "lucide-react";

import { Badge } from "./Badge";
import { RecipeThumbnail } from "./RecipeThumbnail";
import {
  DIET_STYLES,
  DIET_LABELS,
  DIFFICULTY_LABELS,
  DIFFICULTY_STYLES,
  PROTEIN_LABELS,
  formatMinutes,
  formatPriceUsd,
} from "@/lib/format";
import type { RecipeDto } from "@/lib/types";

export function RecipeCard({ recipe }: { recipe: RecipeDto }) {
  const price = formatPriceUsd(recipe.estimatedPriceUsd);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group flex flex-row items-center gap-3 overflow-hidden rounded-2xl border border-violet-100 bg-white/80 p-3 shadow-sm backdrop-blur-sm transition hover:shadow-md dark:border-violet-900/50 dark:bg-violet-950/40 sm:flex-col sm:items-stretch sm:gap-0 sm:rounded-3xl sm:p-0"
    >
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-violet-50 dark:bg-violet-900/40 sm:aspect-[4/5] sm:h-auto sm:w-full sm:rounded-none">
        <RecipeThumbnail
          src={recipe.thumbnailUrl}
          alt={recipe.title}
          className="h-full w-full transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:gap-2 sm:p-4">
        <h3 className="line-clamp-2 font-semibold text-violet-950 dark:text-violet-50">
          {recipe.title}
        </h3>
        {recipe.authorHandle && (
          <p className="text-xs text-violet-500 dark:text-violet-400">@{recipe.authorHandle}</p>
        )}
        <div className="flex flex-wrap gap-1.5 sm:mt-auto sm:pt-2">
          {recipe.difficulty && (
            <Badge
              className={DIFFICULTY_STYLES[recipe.difficulty]}
              icon={<ChefHat size={12} />}
            >
              {DIFFICULTY_LABELS[recipe.difficulty]}
            </Badge>
          )}
          {recipe.totalTimeMinutes != null && (
            <Badge icon={<Clock3 size={12} />}>{formatMinutes(recipe.totalTimeMinutes)}</Badge>
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
