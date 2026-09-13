import { RecipeLibrary } from "@/components/RecipeLibrary";
import { isFullPipelineAvailable } from "@/lib/pipeline";
import { prisma } from "@/lib/prisma";
import { toRecipeDto } from "@/lib/types";
import type { RecipeDto } from "@/lib/types";

// This reads the saved-recipes list fresh on every request; it must not be
// statically prerendered with a build-time snapshot of the (empty) database.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let recipes: RecipeDto[] = [];
  let loadError: string | null = null;

  try {
    const rows = await prisma.recipe.findMany({ orderBy: { createdAt: "desc" } });
    recipes = rows.map(toRecipeDto);
  } catch (err) {
    // Keep the page itself rendering even if the database isn't reachable yet
    // (e.g. DATABASE_URL not configured, or migrations not applied) — show a
    // banner instead of a hard crash.
    console.error("[page] failed to load saved recipes:", err);
    loadError =
      "Couldn't reach the database. If you're still setting this up, make sure DATABASE_URL is configured and migrations have run.";
  }

  const collectionImportEnabled = await isFullPipelineAvailable();

  return (
    <RecipeLibrary
      initialRecipes={recipes}
      loadError={loadError}
      collectionImportEnabled={collectionImportEnabled}
    />
  );
}
