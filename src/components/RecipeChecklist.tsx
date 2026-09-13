"use client";

import { useEffect, useState } from "react";
import { Check, ListOrdered, RotateCcw } from "lucide-react";

import type { Ingredient } from "@/lib/types";

interface Props {
  recipeId: string;
  ingredients: Ingredient[];
  instructions: string[];
}

function loadChecked(key: string): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export function RecipeChecklist({ recipeId, ingredients, instructions }: Props) {
  const ingredientsKey = `recipe-checklist:${recipeId}:ingredients`;
  const stepsKey = `recipe-checklist:${recipeId}:steps`;

  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  // Restore any in-progress checklist (e.g. after the phone's screen locked mid-cook).
  // Deliberately deferred to an effect: localStorage isn't available during server
  // rendering, so the initial render must match SSR (nothing checked) and only pick
  // up the real, persisted values once mounted in the browser.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from localStorage, unavailable during SSR
    setCheckedIngredients(loadChecked(ingredientsKey));
    setCheckedSteps(loadChecked(stepsKey));
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipeId]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(ingredientsKey, JSON.stringify([...checkedIngredients]));
    } catch {
      // localStorage can throw in private-browsing contexts; checklist just won't persist.
    }
  }, [hydrated, ingredientsKey, checkedIngredients]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(stepsKey, JSON.stringify([...checkedSteps]));
    } catch {
      // same as above
    }
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

  const hasProgress = checkedIngredients.size > 0 || checkedSteps.size > 0;

  return (
    <div className="grid gap-8 sm:grid-cols-[1fr_1.4fr]">
      <section>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-black dark:text-violet-100">Ingredients</h2>
          <div className="flex shrink-0 items-center gap-2">
            {hasProgress && (
              <button
                type="button"
                onClick={resetAll}
                className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700 transition hover:bg-violet-200 dark:bg-violet-900/40 dark:text-violet-300"
              >
                <RotateCcw size={12} /> Reset
              </button>
            )}
            <a
              href="#instructions"
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 transition hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300"
            >
              <ListOrdered size={12} /> Jump to Instructions
            </a>
          </div>
        </div>
        <ul className="flex flex-col gap-1">
          {ingredients.map((ing, i) => {
            const checked = checkedIngredients.has(i);
            return (
              <li key={i} className="border-b border-violet-100 dark:border-violet-900/50">
                <label className="flex cursor-pointer items-baseline gap-2 py-2 text-sm active:bg-violet-50 dark:active:bg-violet-900/30">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleIngredient(i)}
                    className="mt-0.5 size-4 shrink-0 accent-rose-400"
                  />
                  {ing.quantity && (
                    <span
                      className={`shrink-0 font-semibold text-rose-500 dark:text-rose-300 ${checked ? "opacity-40 line-through" : ""}`}
                    >
                      {ing.quantity}
                    </span>
                  )}
                  <span className={`text-black dark:text-violet-200 ${checked ? "opacity-40 line-through" : ""}`}>
                    {ing.item}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="instructions" className="scroll-mt-6">
        <h2 className="mb-3 text-lg font-semibold text-black dark:text-violet-100">Instructions</h2>
        <ol className="flex flex-col gap-1">
          {instructions.map((step, i) => {
            const checked = checkedSteps.has(i);
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => toggleStep(i)}
                  className="flex w-full gap-3 rounded-xl py-2 text-left text-sm active:bg-violet-50 dark:active:bg-violet-900/30"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                      checked
                        ? "bg-emerald-400 text-white"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300"
                    }`}
                  >
                    {checked ? <Check size={13} /> : i + 1}
                  </span>
                  <span className={`text-black dark:text-violet-200 ${checked ? "opacity-40 line-through" : ""}`}>
                    {step}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
