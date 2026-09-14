import { redirect } from "next/navigation";

import { RecipeLibrary } from "@/components/RecipeLibrary";
import { getSessionUserId } from "@/lib/auth";
import { isFullPipelineAvailable } from "@/lib/pipeline";
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

  try {
    const [recipeRows, folderRows, user] = await Promise.all([
      prisma.recipe.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.folder.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.user.findUnique({ where: { id: userId }, select: { showThisWeekCard: true } }),
    ]);
    showThisWeekCard = user?.showThisWeekCard ?? true;
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
    />
  );
}
