import { redirect } from "next/navigation";

import { MyRecipesGrid } from "@/components/MyRecipesGrid";
import { getSessionUserId } from "@/lib/auth";
import { countRecipesThisMonth, FREE_RECIPE_LIMIT, isPro, PRO_MONTHLY_RECIPE_LIMIT } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { toFolderDto, toRecipeDto } from "@/lib/types";
import type { FolderDto, RecipeDto } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  let recipes: RecipeDto[] = [];
  let folders: FolderDto[] = [];
  let isProUser = false;
  let myRecipeCount = 0;
  let monthlyRecipeCount = 0;

  try {
    const [recipeRows, folderRows, user, myRecipeCountResult] = await Promise.all([
      prisma.recipe.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
      prisma.folder.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.recipe.count({ where: { userId } }),
    ]);
    isProUser = user ? isPro(user) : false;
    myRecipeCount = myRecipeCountResult;
    if (isProUser) monthlyRecipeCount = await countRecipesThisMonth(userId);
    recipes = recipeRows.map(toRecipeDto);
    folders = folderRows.map(toFolderDto);
  } catch (err) {
    console.error("[recipes/page] failed to load saved recipes:", err);
  }

  return (
    <MyRecipesGrid
      initialRecipes={recipes}
      initialFolders={folders}
      isPro={isProUser}
      myRecipeCount={myRecipeCount}
      freeRecipeLimit={FREE_RECIPE_LIMIT}
      monthlyRecipeCount={monthlyRecipeCount}
      monthlyRecipeLimit={PRO_MONTHLY_RECIPE_LIMIT}
    />
  );
}
