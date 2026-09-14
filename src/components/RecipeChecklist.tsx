"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, RotateCcw, ShoppingCart, Sparkles, X } from "lucide-react";

import { usePantry } from "./PantryProvider";
import { SubstitutionSheet } from "./SubstitutionSheet";
import { useToast } from "./ToastProvider";
import {
  ingredientsStorageKey,
  loadCheckedIndices,
  saveCheckedIndices,
  stepsStorageKey,
} from "@/lib/checklistStorage";
import { addIngredientIndicesToGroceryList } from "@/lib/groceryListStorage";
import { ingredientInPantry } from "@/lib/pantryMatch";
import type { Ingredient } from "@/lib/types";

interface Props {
  recipeId: string;
  ingredients: Ingredient[];
  instructions: string[];
}

export function RecipeChecklist({ recipeId, ingredients, instructions }: Props) {
  const ingredientsKey = ingredientsStorageKey(recipeId);
  const stepsKey = stepsStorageKey(recipeId);

  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<"ingredients" | "instructions">("ingredients");
  const [tappedIngredient, setTappedIngredient] = useState<{ ing: Ingredient; index: number } | null>(null);
  const { names: pantryNames } = usePantry();
  const showToast = useToast();

  const missingIndices = useMemo(
    () => ingredients.map((_, i) => i).filter((i) => !ingredientInPantry(ingredients[i].item, pantryNames)),
    [ingredients, pantryNames],
  );

  function handleAddMissingToGroceryList() {
    addIngredientIndicesToGroceryList(recipeId, missingIndices);
    showToast("Missing ingredients added to your list 🛒");
  }

  // Restore any in-progress checklist (e.g. after the phone's screen locked mid-cook).
  // Deliberately deferred to an effect: localStorage isn't available during server
  // rendering, so the initial render must match SSR (nothing checked) and only pick
  // up the real, persisted values once mounted in the browser.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from localStorage, unavailable during SSR
    setCheckedIngredients(loadCheckedIndices(ingredientsKey));
    setCheckedSteps(loadCheckedIndices(stepsKey));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  useEffect(() => {
    if (!hydrated) return;
    saveCheckedIndices(ingredientsKey, checkedIngredients);
  }, [hydrated, ingredientsKey, checkedIngredients]);

  useEffect(() => {
    if (!hydrated) return;
    saveCheckedIndices(stepsKey, checkedSteps);
  }, [hydrated, stepsKey, checkedSteps]);

  function toggleIngredient(i: number) {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function toggleStep(i: number) {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function resetAll() {
    setCheckedIngredients(new Set());
    setCheckedSteps(new Set());
  }

  const totalItems = ingredients.length + instructions.length;
  const doneItems = checkedIngredients.size + checkedSteps.size;
  const progress = totalItems === 0 ? 0 : Math.round((doneItems / totalItems) * 100);
  const hasProgress = doneItems > 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-full bg-blush p-1">
          <button
            type="button"
            onClick={() => setTab("ingredients")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === "ingredients" ? "bg-white text-rose-deep shadow-md" : "text-dusty-rose"
            }`}
          >
            Ingredients
          </button>
          <button
            type="button"
            onClick={() => setTab("instructions")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === "instructions" ? "bg-white text-rose-deep shadow-md" : "text-dusty-rose"
            }`}
          >
            Instructions
          </button>
        </div>
        {hasProgress && (
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1 rounded-full bg-blush px-3 py-1 text-xs font-medium text-rose-deep shadow-sm transition hover:-translate-y-0.5 hover:bg-blush-dark hover:shadow-md"
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      <div className="h-2 w-full overflow-hidden rounded-full bg-blush-soft">
        <div
          className="h-full rounded-full bg-gradient-to-r from-coral to-rose-deep transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {tab === "ingredients" ? (
        <>
          {pantryNames.length > 0 && missingIndices.length > 0 && (
            <div className="mb-3 rounded-2xl bg-blush/60 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold tracking-wide text-rose-deep uppercase">What I still need</p>
                <button
                  type="button"
                  onClick={handleAddMissingToGroceryList}
                  className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-coral to-rose-deep px-3 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:brightness-105"
                >
                  <ShoppingCart size={11} /> Add missing to grocery list
                </button>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {missingIndices.map((i) => (
                  <li key={i} className="rounded-full bg-white/70 px-2.5 py-1 text-xs text-dusty-rose">
                    {ingredients[i].item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="flex flex-col gap-1">
            {ingredients.map((ing, i) => {
              const checked = checkedIngredients.has(i);
              const inPantry = ingredientInPantry(ing.item, pantryNames);
              return (
                <li key={i} className="border-b border-blush">
                  <div className="flex items-baseline gap-3 py-2.5 text-sm">
                    <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleIngredient(i)}
                        className="peer absolute inset-0 h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-blush-dark bg-white transition checked:border-coral checked:bg-coral"
                      />
                      <Check
                        size={12}
                        className="pointer-events-none relative hidden text-white peer-checked:block"
                      />
                    </span>
                    <button
                      type="button"
                      onClick={() => setTappedIngredient({ ing, index: i })}
                      className="flex flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5 text-left active:opacity-70"
                    >
                      {ing.quantity && (
                        <span
                          className={`shrink-0 font-semibold text-rose-deep ${checked ? "opacity-40 line-through" : ""}`}
                        >
                          {ing.quantity}
                        </span>
                      )}
                      <span className={`text-foreground ${checked ? "opacity-40 line-through" : ""}`}>
                        {ing.item}
                      </span>
                    </button>
                    {pantryNames.length > 0 &&
                      (inPantry ? (
                        <Check size={14} className="shrink-0 text-sage-dark" aria-label="In your pantry" />
                      ) : (
                        <X size={14} className="shrink-0 text-coral-deep/70" aria-label="Not in your pantry" />
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
          {tappedIngredient && (
            <SubstitutionSheet
              ingredient={tappedIngredient.ing}
              recipeId={recipeId}
              recipeIngredients={ingredients}
              onClose={() => setTappedIngredient(null)}
            />
          )}
        </>
      ) : (
        <ol className="flex flex-col gap-1">
          {instructions.map((step, i) => {
            const checked = checkedSteps.has(i);
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => toggleStep(i)}
                  className="flex w-full gap-3 rounded-xl py-2.5 text-left text-sm active:bg-blush-soft"
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition ${
                      checked ? "bg-gradient-to-br from-coral to-rose-deep text-white" : "bg-blush text-rose-deep"
                    }`}
                  >
                    {checked ? <Sparkles size={13} /> : i + 1}
                  </span>
                  <span className={`text-foreground ${checked ? "opacity-40 line-through" : ""}`}>
                    {step}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
