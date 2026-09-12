import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ChefHat, Clock3, DollarSign, ExternalLink, UtensilsCrossed } from "lucide-react";

import { Badge } from "@/components/Badge";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import {
  DIET_LABELS,
  DIET_STYLES,
  DIFFICULTY_LABELS,
  DIFFICULTY_STYLES,
  PRICE_LABELS,
  PRICE_STYLES,
  PROTEIN_LABELS,
  formatMinutes,
  formatPriceUsd,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { toRecipeDto } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RecipeDetailPage({ params }: Props) {
  const { id } = await params;
  const record = await prisma.recipe.findUnique({ where: { id } });
  if (!record) notFound();

  const recipe = toRecipeDto(record);
  const price = formatPriceUsd(recipe.estimatedPriceUsd);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
      >
        <ArrowLeft size={14} /> Back to your recipes
      </Link>

      <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          {recipe.thumbnailUrl ? (
            <Image src={recipe.thumbnailUrl} alt={recipe.title} fill sizes="220px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-neutral-400">
              <UtensilsCrossed size={32} />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{recipe.title}</h1>
          {recipe.authorHandle && (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">@{recipe.authorHandle}</p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {recipe.difficulty && (
              <Badge className={DIFFICULTY_STYLES[recipe.difficulty]} icon={<ChefHat size={12} />}>
                {DIFFICULTY_LABELS[recipe.difficulty]}
              </Badge>
            )}
            {recipe.totalTimeMinutes != null && (
              <Badge icon={<Clock3 size={12} />}>{formatMinutes(recipe.totalTimeMinutes)}</Badge>
            )}
            {recipe.priceLevel && (
              <Badge className={PRICE_STYLES[recipe.priceLevel]} icon={<DollarSign size={12} />}>
                {PRICE_LABELS[recipe.priceLevel]}
                {price ? ` · ${price}` : ""}
              </Badge>
            )}
            {recipe.dietType && (
              <Badge className={DIET_STYLES[recipe.dietType]}>{DIET_LABELS[recipe.dietType]}</Badge>
            )}
            {recipe.proteinType && recipe.proteinType !== "none" && (
              <Badge>{PROTEIN_LABELS[recipe.proteinType]}</Badge>
            )}
            {recipe.servings && <Badge>Serves {recipe.servings}</Badge>}
          </div>

          <div className="mt-auto flex items-center gap-3 pt-2">
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
            >
              Watch on TikTok <ExternalLink size={14} />
            </a>
            <DeleteRecipeButton recipeId={recipe.id} />
          </div>
        </div>
      </div>

      {recipe.confidenceNotes && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          {recipe.confidenceNotes}
        </p>
      )}

      <div className="grid gap-8 sm:grid-cols-[1fr_1.4fr]">
        <section>
          <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Ingredients
          </h2>
          <ul className="flex flex-col gap-2">
            {recipe.ingredients.map((ing, i) => (
              <li
                key={i}
                className="flex justify-between gap-3 border-b border-neutral-100 pb-2 text-sm dark:border-neutral-800"
              >
                <span className="text-neutral-800 dark:text-neutral-200">{ing.item}</span>
                {ing.quantity && (
                  <span className="whitespace-nowrap text-neutral-500 dark:text-neutral-400">
                    {ing.quantity}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Instructions
          </h2>
          <ol className="flex flex-col gap-3">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-semibold text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                  {i + 1}
                </span>
                <span className="text-neutral-800 dark:text-neutral-200">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {recipe.tips.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold text-neutral-900 dark:text-neutral-100">Tips</h2>
          <ul className="list-inside list-disc text-sm text-neutral-700 dark:text-neutral-300">
            {recipe.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
