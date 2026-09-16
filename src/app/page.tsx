import { redirect } from "next/navigation";

import { HomeFeed } from "@/components/HomeFeed";
import { getSessionUserId } from "@/lib/auth";
import { isPro } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { toRecipeDto } from "@/lib/types";
import type { RecipeDto } from "@/lib/types";

// This reads the saved-recipes list fresh on every request; it must not be
// statically prerendered with a build-time snapshot of the (empty) database.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  let recipes: RecipeDto[] = [];
  let loadError: string | null = null;
  let showThisWeekCard = true;
  let isProUser = false;

  try {
    const [recipeRows, user] = await Promise.all([
      prisma.recipe.findMany({ orderBy: { createdAt: "desc" } }),
      prisma.user.findUnique({ where: { id: userId } }),
    ]);
    showThisWeekCard = user?.showThisWeekCard ?? true;
    isProUser = user ? isPro(user) : false;
    recipes = recipeRows.map(toRecipeDto);
  } catch (err) {
    // Keep the page itself rendering even if the database isn't reachable yet
    // (e.g. DATABASE_URL not configured, or migrations not applied) — show a
    // banner instead of a hard crash.
    console.error("[page] failed to load saved recipes:", err);
    loadError =
      "Couldn't reach the database. If you're still setting this up, make sure DATABASE_URL is configured and migrations have run.";
  }

  return (
    <HomeFeed
      initialRecipes={recipes}
      loadError={loadError}
      showThisWeekCard={showThisWeekCard}
      isPro={isProUser}
      currentUserId={userId}
    />
  );
}
