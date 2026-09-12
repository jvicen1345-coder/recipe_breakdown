import { RecipeLibrary } from "@/components/RecipeLibrary";
import { prisma } from "@/lib/prisma";
import { toRecipeDto } from "@/lib/types";

// This reads the saved-recipes list fresh on every request; it must not be
// statically prerendered with a build-time snapshot of the (empty) database.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const recipes = await prisma.recipe.findMany({ orderBy: { createdAt: "desc" } });
  return <RecipeLibrary initialRecipes={recipes.map(toRecipeDto)} />;
}
