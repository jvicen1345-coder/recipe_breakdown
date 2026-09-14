import { PantryPageClient } from "@/components/PantryPageClient";
import { prisma } from "@/lib/prisma";
import { toRecipeDto } from "@/lib/types";
import type { RecipeDto } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function PantryPage() {
  let recipes: RecipeDto[] = [];
  try {
    const rows = await prisma.recipe.findMany({ orderBy: { createdAt: "desc" } });
    recipes = rows.map(toRecipeDto);
  } catch (err) {
    console.error("[pantry page] failed to load recipes:", err);
  }

  return <PantryPageClient recipes={recipes} />;
}
