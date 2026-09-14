"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import { usePantry } from "./PantryProvider";
import { OTHER_CATEGORY, PANTRY_CATEGORIES, PANTRY_CATEGORY_LABELS, categoryForItemName } from "@/lib/pantryCategories";
import { pantryMatchCount } from "@/lib/pantryMatch";
import type { PantryItemDto, RecipeDto } from "@/lib/types";

function formatLastConfirmed(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "Confirmed today";
  if (days === 1) return "Confirmed yesterday";
  return `Confirmed ${days} days ago`;
}

export function PantryPageClient({ recipes }: { recipes: RecipeDto[] }) {
  const { items, names, loading, hasItem, addItem, removeItem } = usePantry();
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState(PANTRY_CATEGORIES[0].key);

  async function toggleStaple(name: string, categoryKey: string) {
    const existing = items.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (existing) await removeItem(existing.id);
    else await addItem(name, categoryKey);
  }

  async function handleAddCustom(e: React.FormEvent) {
    e.preventDefault();
    const name = search.trim();
    if (!name) return;
    await addItem(name, searchCategory);
    setSearch("");
  }

  // Ingredients from your 5 most recently saved recipes that aren't in the pantry yet —
  // a fast way to fill gaps for things you're actually cooking with.
  const recentlyUsedNotOwned = useMemo(() => {
    const recent = [...recipes]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
    const seen = new Set<string>();
    const suggestions: string[] = [];
    for (const recipe of recent) {
      for (const ing of recipe.ingredients) {
        const lower = ing.item.trim().toLowerCase();
        if (!lower || seen.has(lower)) continue;
        seen.add(lower);
        if (hasItem(ing.item)) continue;
        suggestions.push(ing.item);
        if (suggestions.length >= 8) break;
      }
      if (suggestions.length >= 8) break;
    }
    return suggestions;
  }, [recipes, hasItem]);

  const almostThere = useMemo(() => {
    return [...recipes]
      .filter((r) => r.ingredients.length > 0)
      .map((r) => ({ recipe: r, ...pantryMatchCount(r.ingredients, names) }))
      .filter(({ have, total }) => have / total >= 0.8 && have / total < 1)
      .sort((a, b) => a.total - a.have - (b.total - b.have));
  }, [recipes, names]);

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, PantryItemDto[]>();
    for (const item of items) {
      const key = PANTRY_CATEGORY_LABELS[item.category] ? item.category : OTHER_CATEGORY.key;
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const categoriesToShow = [...PANTRY_CATEGORIES, OTHER_CATEGORY];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-sage-dark">My Pantry 🧺</h1>
        <p className="text-sm text-sage-dark/70">Tap staples you keep stocked, or search to add anything else.</p>
      </div>

      <form onSubmit={handleAddCustom} className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sage-dark/60" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or add any ingredient…"
            className="w-full rounded-full border border-sage/50 bg-white py-2.5 pr-4 pl-10 text-sm outline-none focus:border-sage-dark focus:ring-2 focus:ring-sage/30"
          />
        </div>
        <select
          value={searchCategory}
          onChange={(e) => setSearchCategory(e.target.value)}
          className="rounded-full border border-sage/50 bg-white px-4 py-2.5 text-sm outline-none focus:border-sage-dark focus:ring-2 focus:ring-sage/30"
        >
          {PANTRY_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
          <option value={OTHER_CATEGORY.key}>Other</option>
        </select>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1 rounded-full bg-gradient-to-r from-sage-dark to-sage px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
        >
          <Plus size={14} /> Add
        </button>
      </form>

      {recentlyUsedNotOwned.length > 0 && (
        <section>
          <h2 className="mb-2 font-serif text-lg font-semibold text-sage-dark">Used in your recent saves 👇</h2>
          <div className="flex flex-wrap gap-2">
            {recentlyUsedNotOwned.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addItem(name, categoryForItemName(name))}
                className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-sage-dark shadow-[0_2px_6px_-1px_rgba(127,154,114,0.35)] transition hover:-translate-y-0.5 hover:bg-sage/10 hover:shadow-[0_4px_10px_-1px_rgba(127,154,114,0.45)]"
              >
                <Plus size={12} /> {name}
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-6">
        {categoriesToShow.map((category) => {
          const staples = category.items;
          const owned = itemsByCategory.get(category.key) ?? [];
          const ownedStapleNames = new Set(staples.map((s) => s.toLowerCase()));
          const custom = owned.filter((item) => !ownedStapleNames.has(item.name.toLowerCase()));
          if (staples.length === 0 && custom.length === 0) return null;

          return (
            <section key={category.key}>
              <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-sage-dark">
                <span>{category.emoji}</span> {category.label}
              </h2>
              <div className="flex flex-wrap gap-2">
                {staples.map((name) => {
                  const item = owned.find((i) => i.name.toLowerCase() === name.toLowerCase());
                  const active = Boolean(item);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleStaple(name, category.key)}
                      title={item ? formatLastConfirmed(item.lastConfirmedAt) : undefined}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                        active
                          ? "bg-gradient-to-r from-sage-dark to-sage text-white shadow-md"
                          : "bg-white text-sage-dark shadow-[0_2px_6px_-1px_rgba(127,154,114,0.35)] hover:-translate-y-0.5 hover:shadow-[0_4px_10px_-1px_rgba(127,154,114,0.45)]"
                      }`}
                    >
                      {active ? "✓ " : ""}
                      {name}
                    </button>
                  );
                })}
                {custom.map((item) => (
                  <span
                    key={item.id}
                    title={formatLastConfirmed(item.lastConfirmedAt)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-sage-dark to-sage px-4 py-1.5 text-sm font-medium text-white shadow-md"
                  >
                    ✓ {item.name}
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Remove ${item.name}`}
                      className="hover:opacity-70"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {!loading && recipes.length > 0 && (
        <section className="rounded-2xl bg-sage/15 px-4 py-4">
          <h2 className="mb-1 font-serif text-base font-semibold text-sage-dark">
            {almostThere.length > 0
              ? `🎉 ${almostThere.length} recipe${almostThere.length === 1 ? "" : "s"} you can almost make`
              : "Recipes you can almost make"}
          </h2>
          {almostThere.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-1.5 text-sm text-sage-dark">
              {almostThere.slice(0, 5).map(({ recipe, have, total }) => (
                <li key={recipe.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{recipe.title}</span>
                  <span className="shrink-0 text-xs text-sage-dark/70">
                    {have}/{total} — missing {total - have}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-sage-dark/70">Add a few more staples to see recipes you can almost make ✨</p>
          )}
        </section>
      )}
    </div>
  );
}
