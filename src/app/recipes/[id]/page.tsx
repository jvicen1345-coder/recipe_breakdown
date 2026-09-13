import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ChefHat, Clock3, DollarSign, ExternalLink } from "lucide-react";

import { Badge } from "@/components/Badge";
import { DeleteRecipeButton } from "@/components/DeleteRecipeButton";
import { FavoriteButton } from "@/components/FavoriteButton";
import { RecipeChecklist } from "@/components/RecipeChecklist";
import { RecipeThumbnail } from "@/components/RecipeThumbnail";
import {
  DIET_LABELS,
  DIET_STYLES,
  DIFFICULTY_LABELS,
  DIFFICULTY_STYLES,
  PRICE_LABELS,
  PRICE_STYLES,
  PROTEIN_LABELS,
  TIME_BADGE_STYLE,
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
        className="inline-flex w-fit items-center gap-1 text-sm text-dusty-rose hover:text-rose-deep"
      >
        <ArrowLeft size={14} /> Back to your recipes
      </Link>

      <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-blush-soft sm:aspect-[4/5]">
          <RecipeThumbnail src={recipe.thumbnailUrl} alt={recipe.title} className="h-full w-full" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-black/0 to-black/0" />
          <FavoriteButton recipeId={recipe.id} className="absolute top-2.5 right-2.5" />
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="font-serif text-2xl font-semibold text-rose-deep sm:text-3xl">
            {recipe.title}
          </h1>
          {recipe.authorHandle && (
            <p className="text-sm text-dusty-rose">@{recipe.authorHandle}</p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {recipe.difficulty && (
              <Badge className={DIFFICULTY_STYLES[recipe.difficulty]} icon={<ChefHat size={12} />}>
                {DIFFICULTY_LABELS[recipe.difficulty]}
              </Badge>
            )}
            {recipe.totalTimeMinutes != null && (
              <Badge className={TIME_BADGE_STYLE} icon={<Clock3 size={12} />}>
                {formatMinutes(recipe.totalTimeMinutes)}
              </Badge>
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
              className="inline-flex items-center gap-1 text-sm font-medium text-coral-deep hover:underline"
            >
              Watch on TikTok <ExternalLink size={14} />
            </a>
            <DeleteRecipeButton recipeId={recipe.id} />
          </div>
        </div>
      </div>

      {recipe.confidenceNotes && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {recipe.confidenceNotes}
        </p>
      )}

      <RecipeChecklist recipeId={recipe.id} ingredients={recipe.ingredients} instructions={recipe.instructions} />

      {recipe.tips.length > 0 && (
        <section>
          <h2 className="mb-3 font-serif text-lg font-semibold text-rose-deep">Tips</h2>
          <ul className="list-inside list-disc text-sm text-foreground/90">
            {recipe.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
