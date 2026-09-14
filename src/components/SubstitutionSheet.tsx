"use client";

import { BottomSheet } from "./BottomSheet";
import { usePantry } from "./PantryProvider";
import { loadGroceryItemKeys } from "@/lib/groceryListStorage";
import { ingredientInPantry } from "@/lib/pantryMatch";
import { findSubstitutions } from "@/lib/substitutions";
import type { Ingredient } from "@/lib/types";

export function SubstitutionSheet({
  ingredient,
  recipeId,
  recipeIngredients,
  onClose,
}: {
  ingredient: Ingredient;
  recipeId: string;
  recipeIngredients: Ingredient[];
  onClose: () => void;
}) {
  const { names: pantryNames } = usePantry();
  const subs = findSubstitutions(ingredient.item);

  // "Already on your list" is scoped to this recipe's own grocery entries — the
  // grocery list doesn't track ingredient text globally, only recipe+index keys.
  const groceryKeys = typeof window !== "undefined" ? loadGroceryItemKeys() : new Set<string>();
  const onListText = [...groceryKeys]
    .filter((key) => key.startsWith(`${recipeId}:`))
    .map((key) => recipeIngredients[Number(key.slice(recipeId.length + 1))]?.item.toLowerCase())
    .filter((text): text is string => Boolean(text));

  return (
    <BottomSheet onClose={onClose}>
      <h3 className="mb-1 font-serif text-lg font-semibold text-rose-deep">{ingredient.item}</h3>
      <p className="mb-4 text-xs text-dusty-rose">Smart swaps for this ingredient</p>

      {subs ? (
        <ul className="flex flex-col gap-2.5">
          {subs.map((sub) => {
            const inPantry = ingredientInPantry(sub.name, pantryNames);
            const subNameLower = sub.name.toLowerCase();
            const alreadyOnList = onListText.some(
              (text) => text.includes(subNameLower) || subNameLower.includes(text),
            );
            return (
              <li key={sub.name} className="rounded-2xl bg-white/80 px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-rose-deep">{sub.name}</span>
                  {sub.dietTag && (
                    <span className="rounded-full bg-peach px-2 py-0.5 text-[10px] font-semibold text-peach-dark">
                      ✓ {sub.dietTag}
                    </span>
                  )}
                  {inPantry && (
                    <span className="rounded-full bg-sage/40 px-2 py-0.5 text-[10px] font-semibold text-sage-dark">
                      In your pantry ✓
                    </span>
                  )}
                  {alreadyOnList && (
                    <span className="rounded-full bg-lavender px-2 py-0.5 text-[10px] font-semibold text-lavender-dark">
                      Already on your list 🛒
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-dusty-rose">{sub.note}</p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-2xl bg-white/80 px-4 py-4 text-center text-sm text-dusty-rose">
          No common swaps for this one — it&apos;s essential! 🌸
        </p>
      )}
    </BottomSheet>
  );
}
