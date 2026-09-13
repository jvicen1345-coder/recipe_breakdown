"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardCopy, RefreshCw } from "lucide-react";

import { useToast } from "./ToastProvider";
import { ingredientsStorageKey, loadCheckedIndices } from "@/lib/checklistStorage";
import {
  categorizeIngredient,
  GROCERY_CATEGORY_META,
  GROCERY_CATEGORY_ORDER,
  type GroceryCategory,
} from "@/lib/groceryCategories";
import type { RecipeDto } from "@/lib/types";

interface GroceryItem {
  key: string;
  item: string;
  quantity: string | null;
  category: GroceryCategory;
  recipeTitle: string;
}

const CROSSED_OFF_KEY = "grocery-crossed-off";

function loadCrossedOff(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(CROSSED_OFF_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveCrossedOff(ids: Set<string>) {
  try {
    localStorage.setItem(CROSSED_OFF_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage can throw in private-browsing contexts; crossed-off state just won't persist.
  }
}

function buildGroceryItems(recipes: RecipeDto[]): GroceryItem[] {
  const items: GroceryItem[] = [];
  for (const recipe of recipes) {
    const checked = loadCheckedIndices(ingredientsStorageKey(recipe.id));
    recipe.ingredients.forEach((ing, index) => {
      if (!checked.has(index)) return;
      items.push({
        key: `${recipe.id}:${index}`,
        item: ing.item,
        quantity: ing.quantity,
        category: categorizeIngredient(ing.item),
        recipeTitle: recipe.title,
      });
    });
  }
  return items;
}

export function GroceryList({ initialRecipes }: { initialRecipes: RecipeDto[] }) {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [crossedOff, setCrossedOff] = useState<Set<string>>(new Set());
  const showToast = useToast();

  function refresh() {
    setItems(buildGroceryItems(initialRecipes));
    setCrossedOff(loadCrossedOff());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads each recipe's checklist from localStorage, unavailable during SSR
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCrossedOff(key: string) {
    setCrossedOff((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      saveCrossedOff(next);
      return next;
    });
  }

  const grouped = useMemo(() => {
    const byCategory = new Map<GroceryCategory, GroceryItem[]>();
    for (const item of items) {
      const list = byCategory.get(item.category) ?? [];
      list.push(item);
      byCategory.set(item.category, list);
    }
    return byCategory;
  }, [items]);

  async function handleCopy() {
    const lines: string[] = [];
    for (const category of GROCERY_CATEGORY_ORDER) {
      const categoryItems = grouped.get(category);
      if (!categoryItems || categoryItems.length === 0) continue;
      lines.push(`${GROCERY_CATEGORY_META[category].label}:`);
      for (const item of categoryItems) {
        lines.push(`- ${item.quantity ? `${item.quantity} ` : ""}${item.item}`);
      }
      lines.push("");
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n").trim());
      showToast("Copied! 📋");
    } catch {
      showToast("Couldn't copy — try selecting the list manually.");
    }
  }

  return (
    <div className="page-fade-in mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="font-serif text-3xl font-semibold text-sage-dark">Grocery List</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1 rounded-full bg-sage/30 px-3 py-1.5 text-xs font-medium text-sage-dark transition hover:bg-sage/50"
          >
            <RefreshCw size={12} /> Refresh
          </button>
          {items.length > 0 && (
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-full bg-sage-dark px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-105"
            >
              <ClipboardCopy size={12} /> Copy list
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-sage p-16 text-center text-sage-dark">
          <span className="text-4xl">🥬</span>
          <p className="font-serif text-lg">Nothing on your list yet</p>
          <p className="text-sm">Check off ingredients on a recipe and they&apos;ll show up here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {GROCERY_CATEGORY_ORDER.map((category) => {
            const categoryItems = grouped.get(category);
            if (!categoryItems || categoryItems.length === 0) return null;
            const meta = GROCERY_CATEGORY_META[category];
            return (
              <section key={category}>
                <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-sage-dark">
                  <span>{meta.emoji}</span> {meta.label}
                </h2>
                <ul className="flex flex-col gap-1 rounded-2xl bg-white/70 p-2 ring-1 ring-sage/40">
                  {categoryItems.map((item) => {
                    const checked = crossedOff.has(item.key);
                    return (
                      <li key={item.key}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm transition hover:bg-sage/10">
                          <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCrossedOff(item.key)}
                              className="peer absolute inset-0 h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-sage bg-white transition checked:border-sage-dark checked:bg-sage-dark"
                            />
                            <Check
                              size={12}
                              className="pointer-events-none relative hidden text-white peer-checked:block"
                            />
                          </span>
                          <span className={`flex-1 ${checked ? "text-foreground/40 line-through" : "text-foreground"}`}>
                            {item.quantity && <span className="font-semibold">{item.quantity} </span>}
                            {item.item}
                          </span>
                          <span className="shrink-0 text-[11px] text-sage-dark/70">{item.recipeTitle}</span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
