import { redirect } from "next/navigation";

import { RecipeLibrary } from "@/components/RecipeLibrary";
import { getSessionUserId } from "@/lib/auth";
import { isFullPipelineAvailable } from "@/lib/pipeline";
import { FREE_RECIPE_LIMIT, isPro } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { toFolderDto, toRecipeDto } from "@/lib/types";
import type { FolderDto, RecipeDto } from "@/lib/types";

// This reads the saved-recipes list fresh on every request; it must not be
// statically prerendered with a build-time snapshot of the (empty) database.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  let recipes: RecipeDto[] = [];
  let folders: FolderDto[] = [];
  let loadError: string | null = null;
  let showThisWeekCard = true;
  let isProUser = false;
  let myRecipeCount = 0;

  try {
    const [recipeRows, folderRows, user, myRecipeCountResult] = await Promise.all([
      prisma.recipe.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.folder.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.recipe.count({ where: { createdByUserId: userId } }),
    ]);
    showThisWeekCard = user?.showThisWeekCard ?? true;
    isProUser = user ? isPro(user) : false;
    myRecipeCount = myRecipeCountResult;
    recipes = recipeRows.map(toRecipeDto);
    folders = folderRows.map(toFolderDto);
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
      initialFolders={folders}
      loadError={loadError}
      collectionImportEnabled={collectionImportEnabled}
      showThisWeekCard={showThisWeekCard}
      isPro={isProUser}
      myRecipeCount={myRecipeCount}
      freeRecipeLimit={FREE_RECIPE_LIMIT}
    />
  );
}
