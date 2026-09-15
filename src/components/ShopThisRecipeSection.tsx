"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ShoppingCart } from "lucide-react";

import { RetailerSelector } from "./RetailerSelector";
import { ShopConfirmOverlay } from "./ShopConfirmOverlay";
import { useToast } from "./ToastProvider";
import { cleanIngredient, DELIVERY_PROVIDER_META, openRetailerWithFallback, trackAffiliateClick, type DeliveryProvider } from "@/lib/delivery";
import { addIngredientIndicesToGroceryList } from "@/lib/groceryListStorage";
import { ingredientInPantry } from "@/lib/pantryMatch";
import { buildShopClipboardText } from "@/lib/shopClipboard";
import { useShoppingReturnToast } from "@/lib/useShoppingReturnToast";
import type { Ingredient } from "@/lib/types";

interface Props {
  recipeId: string;
  ingredients: Ingredient[];
  pantryNames: string[];
  /** True until the pantry has finished its initial fetch — used to defer seeding the checklist. */
  pantryLoading: boolean;
}

// Feature 3: every recipe page's shop section — a pantry-aware checklist scoped to
// this recipe, feeding the same shared RetailerSelector used on the grocery list.
export function ShopThisRecipeSection({ recipeId, ingredients, pantryNames, pantryLoading }: Props) {
  const showToast = useToast();
  const armReturnToast = useShoppingReturnToast();
  const [pendingShop, setPendingShop] = useState<DeliveryProvider | null>(null);

  const pantryIndices = useMemo(
    () => new Set(ingredients.map((_, i) => i).filter((i) => ingredientInPantry(ingredients[i].item, pantryNames))),
    [ingredients, pantryNames],
  );

  // Pantry items start unchecked (you already have them); everything else starts
  // checked (you'll need to buy it) — per spec, the default is "shop for what's missing".
  // Pantry data loads asynchronously, so the very first render never has it yet —
  // seed once, right after that fetch finishes, rather than at mount.
  const [checked, setChecked] = useState<Set<number>>(
    () => new Set(ingredients.map((_, i) => i)),
  );
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || pantryLoading) return;
    seededRef.current = true;
    setChecked(new Set(ingredients.map((_, i) => i).filter((i) => !pantryIndices.has(i))));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed exactly once, right when pantry data first becomes available
  }, [pantryLoading]);

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function selectAll() {
    setChecked(new Set(ingredients.map((_, i) => i)));
  }

  function deselectPantryItems() {
    setChecked((prev) => {
      const next = new Set(prev);
      for (const i of pantryIndices) next.delete(i);
      return next;
    });
  }

  const checkedIngredients = useMemo(
    () => Array.from(checked).sort((a, b) => a - b).map((i) => ingredients[i]),
    [checked, ingredients],
  );

  async function handleSelectRetailer(provider: DeliveryProvider) {
    if (checkedIngredients.length === 0) {
      showToast("Select at least one ingredient to shop for 🌸");
      return;
    }

    try {
      await navigator.clipboard.writeText(
        buildShopClipboardText(checkedIngredients, "My Cutesy Eats Shopping List 🌸"),
      );
    } catch {
      // Silent by design — the retailer hand-off below still works either way.
    }

    trackAffiliateClick({
      retailer: provider,
      source: "recipe_page",
      ingredientCount: checkedIngredients.length,
      items: checkedIngredients.map((i) => i.item),
      recipeId,
    });
    setPendingShop(provider);
  }

  function confirmShop() {
    const provider = pendingShop;
    setPendingShop(null);
    if (!provider) return;
    const firstIngredient = checkedIngredients[0] ? cleanIngredient(checkedIngredients[0].item) : "";
    armReturnToast();
    openRetailerWithFallback(provider, firstIngredient);
  }

  function handleAddMissingToGroceryList() {
    const uncheckedNonPantry = ingredients
      .map((_, i) => i)
      .filter((i) => !checked.has(i) && !pantryIndices.has(i));
    if (uncheckedNonPantry.length === 0) {
      showToast("Nothing left to add — you've got it all covered 🌸");
      return;
    }
    addIngredientIndicesToGroceryList(recipeId, uncheckedNonPantry);
    showToast("Added to your grocery list 🛒");
  }

  return (
    <section className="flex flex-col gap-4 rounded-[1.75rem] border border-blush-dark/50 bg-white/85 p-5 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold text-rose-deep">Shop this recipe 🛒</h2>
        <span className="text-xs font-medium text-dusty-rose">
          Shopping for {checked.size} ingredient{checked.size === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex gap-3 text-xs font-medium">
        <button type="button" onClick={selectAll} className="text-coral-deep underline-offset-2 hover:underline">
          Select all
        </button>
        {pantryIndices.size > 0 && (
          <button
            type="button"
            onClick={deselectPantryItems}
            className="text-dusty-rose underline-offset-2 hover:underline"
          >
            Deselect pantry items
          </button>
        )}
      </div>

      <ul className="flex flex-col gap-1">
        {ingredients.map((ing, i) => {
          const inPantry = pantryIndices.has(i);
          const isChecked = checked.has(i);
          return (
            <li key={i} className="flex items-center gap-3 rounded-2xl px-2 py-2 text-sm">
              <button
                type="button"
                onClick={() => toggle(i)}
                aria-label={isChecked ? "Uncheck ingredient" : "Check ingredient"}
                className="relative flex h-5 w-5 shrink-0 items-center justify-center"
              >
                <span
                  className={`absolute inset-0 h-5 w-5 rounded-full border-2 transition ${
                    isChecked ? "border-coral bg-coral" : "border-blush-dark bg-white"
                  }`}
                />
                {isChecked && <Check size={12} className="relative text-white" />}
              </button>
              <span className="flex-1">
                {ing.quantity && <span className="font-semibold text-rose-deep">{ing.quantity} </span>}
                {ing.item}
              </span>
              {inPantry && (
                <span className="shrink-0 rounded-full bg-sage/20 px-2 py-0.5 text-[10px] font-semibold text-sage-dark">
                  In your pantry 🌸
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <RetailerSelector onSelect={handleSelectRetailer} />

      <button
        type="button"
        onClick={handleAddMissingToGroceryList}
        className="inline-flex w-fit items-center gap-1 self-center text-xs font-medium text-coral-deep underline-offset-2 hover:underline"
      >
        <ShoppingCart size={12} /> Add missing ingredients to my grocery list
      </button>

      {pendingShop && (
        <ShopConfirmOverlay retailerLabel={DELIVERY_PROVIDER_META[pendingShop].label} onConfirm={confirmShop} />
      )}
    </section>
  );
}
