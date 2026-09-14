import { GroceryPantryPage } from "@/components/GroceryPantryPage";
import { prisma } from "@/lib/prisma";
import { toRecipeDto } from "@/lib/types";
import type { RecipeDto } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function GroceryListPage() {
  let recipes: RecipeDto[] = [];
  try {
    const rows = await prisma.recipe.findMany({ orderBy: { createdAt: "desc" } });
    recipes = rows.map(toRecipeDto);
  } catch (err) {
    console.error("[grocery-list page] failed to load recipes:", err);
  }

  return <GroceryPantryPage recipes={recipes} />;
}
