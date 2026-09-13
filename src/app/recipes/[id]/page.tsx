import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FavoriteButton } from "@/components/FavoriteButton";
import { RecipeDetailContent } from "@/components/RecipeDetailContent";
import { RecipeThumbnail } from "@/components/RecipeThumbnail";
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

  return (
    <div className="page-fade-in mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1 text-sm text-dusty-rose hover:text-rose-deep"
      >
        <ArrowLeft size={14} /> Back to your recipes
      </Link>

      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-3xl bg-blush-soft">
        <RecipeThumbnail src={recipe.thumbnailUrl} alt={recipe.title} className="h-full w-full" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-black/0 to-black/0" />
        <FavoriteButton recipeId={recipe.id} className="absolute top-2.5 right-2.5" />
      </div>

      <RecipeDetailContent recipe={recipe} />
    </div>
  );
}
