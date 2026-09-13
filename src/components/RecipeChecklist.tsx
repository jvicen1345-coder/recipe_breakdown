"use client";

import { useEffect, useState } from "react";
import { Check, RotateCcw, Sparkles } from "lucide-react";

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
  const [tab, setTab] = useState<"ingredients" | "instructions">("ingredients");

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
              tab === "ingredients" ? "bg-white text-rose-deep shadow-sm" : "text-dusty-rose"
            }`}
          >
            Ingredients
          </button>
          <button
            type="button"
            onClick={() => setTab("instructions")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === "instructions" ? "bg-white text-rose-deep shadow-sm" : "text-dusty-rose"
            }`}
          >
            Instructions
          </button>
        </div>
        {hasProgress && (
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1 rounded-full bg-blush px-3 py-1 text-xs font-medium text-rose-deep transition hover:bg-blush-dark"
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
        <ul className="flex flex-col gap-1">
          {ingredients.map((ing, i) => {
            const checked = checkedIngredients.has(i);
            return (
              <li key={i} className="border-b border-blush">
                <label className="flex cursor-pointer items-baseline gap-3 py-2.5 text-sm active:bg-blush-soft">
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
                </label>
              </li>
            );
          })}
        </ul>
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
