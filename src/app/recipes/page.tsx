import { MyRecipesGrid } from "@/components/MyRecipesGrid";
import { prisma } from "@/lib/prisma";
import { toFolderDto, toRecipeDto } from "@/lib/types";
import type { FolderDto, RecipeDto } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function MyRecipesPage() {
  let recipes: RecipeDto[] = [];
  let folders: FolderDto[] = [];
  let loadError: string | null = null;

  try {
    const [recipeRows, folderRows] = await Promise.all([
      prisma.recipe.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.folder.findMany({ orderBy: { createdAt: "asc" } }),
    ]);
    recipes = recipeRows.map(toRecipeDto);
    folders = folderRows.map(toFolderDto);
  } catch (err) {
    console.error("[recipes page] failed to load recipes/folders:", err);
    loadError = "Couldn't reach the database. Check DATABASE_URL and that migrations have run.";
  }

  return <MyRecipesGrid initialRecipes={recipes} initialFolders={folders} loadError={loadError} />;
}
