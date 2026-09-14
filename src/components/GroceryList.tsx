"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardCopy, RefreshCw, ShoppingBag, ShoppingCart, Trash2 } from "lucide-react";

import { usePantry } from "./PantryProvider";
import { usePlan } from "./PlanProvider";
import { ProLockBadge } from "./ProLockBadge";
import { useProUpsell } from "./ProUpsellProvider";
import { SmartCartSheet } from "./SmartCartSheet";
import { useToast } from "./ToastProvider";
import {
  clearGroceryList,
  loadCrossedOff,
  loadGroceryItemKeys,
  saveCrossedOff,
} from "@/lib/groceryListStorage";
import {
  categorizeIngredient,
  GROCERY_CATEGORY_META,
  GROCERY_CATEGORY_ORDER,
  type GroceryCategory,
} from "@/lib/groceryCategories";
import { daysSince } from "@/lib/pantryStaleness";
import type { RecipeDto } from "@/lib/types";

export interface GroceryItem {
  key: string;
  item: string;
  quantity: string | null;
  category: GroceryCategory;
  recipeId: string;
  recipeTitle: string;
}

function buildGroceryItems(recipes: RecipeDto[]): GroceryItem[] {
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const items: GroceryItem[] = [];
  for (const key of loadGroceryItemKeys()) {
    const separatorIndex = key.lastIndexOf(":");
    const recipeId = key.slice(0, separatorIndex);
    const index = Number(key.slice(separatorIndex + 1));
    const recipe = recipeById.get(recipeId);
    const ing = recipe?.ingredients[index];
    if (!recipe || !ing) continue;
    items.push({
      key,
      item: ing.item,
      quantity: ing.quantity,
      category: categorizeIngredient(ing.item),
      recipeId,
      recipeTitle: recipe.title,
    });
  }
  return items;
}

export function GroceryList({
  initialRecipes,
  onQuickRefresh,
}: {
  initialRecipes: RecipeDto[];
  /** Opens the "still have these?" bottom sheet — used by the staleness banner below. */
  onQuickRefresh: () => void;
}) {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [crossedOff, setCrossedOff] = useState<Set<string>>(new Set());
  const [showSmartCart, setShowSmartCart] = useState(false);
  const [showStaleBlock, setShowStaleBlock] = useState(false);
  const showToast = useToast();
  const { names: pantryNames } = usePantry();
  const { isPro, pantryOnboardedAt, pantryLastConfirmedAt, stalenessLevel } = usePlan();
  const openUpsell = useProUpsell();
  const showStaleBanner = Boolean(pantryOnboardedAt) && (stalenessLevel === "banner" || stalenessLevel === "block");
  const staleDays = daysSince(pantryLastConfirmedAt);

  function handleOrderWhatINeed() {
    if (!isPro) {
      openUpsell("smart-cart");
      return;
    }
    // Bridge: delivery cart must always check pantry staleness before generating —
    // 30+ days blocks cart generation outright until a quick refresh happens.
    if (Boolean(pantryOnboardedAt) && stalenessLevel === "block") {
      setShowStaleBlock(true);
      return;
    }
    setShowSmartCart(true);
  }

  function refresh() {
    setItems(buildGroceryItems(initialRecipes));
    setCrossedOff(loadCrossedOff());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads from localStorage, unavailable during SSR
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

  function handleClear() {
    if (!confirm("Clear your whole grocery list?")) return;
    clearGroceryList();
    setItems([]);
    setCrossedOff(new Set());
    showToast("Grocery list cleared 🧹");
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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-3xl font-semibold text-sage-dark">Grocery List</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1 rounded-full bg-sage/30 px-3 py-1.5 text-xs font-medium text-sage-dark shadow-sm transition hover:bg-sage/50"
          >
            <RefreshCw size={12} /> Refresh
          </button>
          {items.length > 0 && (
            <>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 rounded-full bg-sage-dark px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-105"
              >
                <ClipboardCopy size={12} /> Copy list
              </button>
              <button
                type="button"
                onClick={handleOrderWhatINeed}
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-coral to-rose-deep px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-105"
              >
                <ShoppingCart size={12} /> Order what I need
              </button>
              {!isPro && <ProLockBadge reason="smart-cart" />}
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1 rounded-full bg-coral/20 px-3 py-1.5 text-xs font-medium text-coral-deep shadow-sm transition hover:bg-coral/30"
              >
                <Trash2 size={12} /> Clear list
              </button>
            </>
          )}
        </div>
      </div>

      {showStaleBanner && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          <span className="flex items-center gap-2">
            <ShoppingBag size={15} className="shrink-0" />
            Your pantry was last updated {staleDays ?? "a while"} day{staleDays === 1 ? "" : "s"} ago 🧺 — quick
            refresh before building your cart?
          </span>
          <button
            type="button"
            onClick={onQuickRefresh}
            className="shrink-0 rounded-full bg-amber-200/70 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-200"
          >
            Quick refresh
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-sage p-16 text-center text-sage-dark">
          <span className="text-4xl">🥬</span>
          <p className="font-serif text-lg">Nothing on your list yet</p>
          <p className="text-sm">Tap &quot;Save to List&quot; on a recipe and it&apos;ll show up here.</p>
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

      {showSmartCart && (
        <SmartCartSheet items={items} pantryNames={pantryNames} onClose={() => setShowSmartCart(false)} />
      )}

      {showStaleBlock && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-rose-deep/30 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex w-full max-w-sm flex-col gap-4 rounded-t-[2rem] bg-white p-6 text-center shadow-[0_-20px_60px_-20px_rgba(192,120,140,0.5)] sm:rounded-[2rem] sm:shadow-[0_30px_70px_-25px_rgba(192,120,140,0.6)]">
            <h2 className="font-serif text-xl font-semibold text-sage-dark">Let&apos;s check your pantry first 🧺</h2>
            <p className="text-sm text-sage-dark/80">
              It&apos;s been {staleDays ?? "a while"} day{staleDays === 1 ? "" : "s"} since your pantry was
              updated — a quick refresh keeps your cart from ordering things you already have.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowStaleBlock(false);
                onQuickRefresh();
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sage-dark to-sage px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
            >
              Quick refresh
            </button>
            <button
              type="button"
              onClick={() => setShowStaleBlock(false)}
              className="text-xs font-medium text-sage-dark/70 underline-offset-2 hover:underline"
            >
              Not right now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
