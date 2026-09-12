import Image from "next/image";
import Link from "next/link";
import { Clock3, ChefHat, DollarSign, UtensilsCrossed } from "lucide-react";

import { Badge } from "./Badge";
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
      className="group flex flex-col overflow-hidden rounded-3xl border border-violet-100 bg-white/80 shadow-sm backdrop-blur-sm transition hover:shadow-md dark:border-violet-900/50 dark:bg-violet-950/40"
    >
      <div className="relative aspect-[4/5] w-full bg-violet-50 dark:bg-violet-900/40">
        {recipe.thumbnailUrl ? (
          <Image
            src={recipe.thumbnailUrl}
            alt={recipe.title}
            fill
            sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-violet-300">
            <UtensilsCrossed size={32} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-semibold text-violet-950 dark:text-violet-50">
          {recipe.title}
        </h3>
        {recipe.authorHandle && (
          <p className="text-xs text-violet-500 dark:text-violet-400">@{recipe.authorHandle}</p>
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
