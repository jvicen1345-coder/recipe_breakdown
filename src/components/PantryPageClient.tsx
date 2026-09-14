"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";

import { usePantry } from "./PantryProvider";
import { pantryMatchCount } from "@/lib/pantryMatch";
import type { RecipeDto } from "@/lib/types";

const STAPLE_CATEGORIES: { category: string; emoji: string; items: string[] }[] = [
  {
    category: "Oils & Vinegars",
    emoji: "🫒",
    items: ["Olive oil", "Vegetable oil", "Balsamic vinegar", "Apple cider vinegar", "Sesame oil"],
  },
  {
    category: "Spices",
    emoji: "🧂",
    items: ["Salt", "Black pepper", "Garlic powder", "Onion powder", "Paprika", "Cumin", "Chili powder", "Oregano", "Cinnamon"],
  },
  { category: "Grains & Pasta", emoji: "🍝", items: ["Rice", "Pasta", "Flour", "Bread", "Quinoa", "Oats"] },
  { category: "Dairy", emoji: "🧀", items: ["Butter", "Milk", "Eggs", "Parmesan", "Cheddar cheese"] },
  {
    category: "Canned Goods",
    emoji: "🥫",
    items: ["Canned tomatoes", "Chicken broth", "Canned beans", "Coconut milk", "Tomato paste"],
  },
];

export function PantryPageClient({ recipes }: { recipes: RecipeDto[] }) {
  const { items, names, loading, hasItem, addItem, removeItem } = usePantry();
  const [search, setSearch] = useState("");
  const [searchCategory, setSearchCategory] = useState(STAPLE_CATEGORIES[0].category);

  async function toggleStaple(name: string, category: string) {
    const existing = items.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (existing) await removeItem(existing.id);
    else await addItem(name, category);
  }

  async function handleAddCustom(e: React.FormEvent) {
    e.preventDefault();
    const name = search.trim();
    if (!name) return;
    await addItem(name, searchCategory);
    setSearch("");
  }

  const almostThere = useMemo(() => {
    return recipes.filter((r) => {
      if (r.ingredients.length === 0) return false;
      const { have, total } = pantryMatchCount(r.ingredients, names);
      const ratio = have / total;
      return ratio >= 0.8 && ratio < 1;
    });
  }, [recipes, names]);

  const customItemsByCategory = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const isStaple = STAPLE_CATEGORIES.some((c) =>
        c.items.some((s) => s.toLowerCase() === item.name.toLowerCase()),
      );
      if (isStaple) continue;
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return map;
  }, [items]);

  const otherCategories = [...customItemsByCategory.keys()].filter(
    (cat) => !STAPLE_CATEGORIES.some((c) => c.category === cat),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold text-sage-dark">My Pantry 🧺</h1>
        <p className="text-sm text-sage-dark/70">Tap staples you keep stocked, or search to add anything else.</p>
      </div>

      {!loading && recipes.length > 0 && (
        <p className="rounded-2xl bg-sage/15 px-4 py-3 text-sm font-medium text-sage-dark">
          {almostThere.length > 0
            ? `🎉 ${almostThere.length} recipe${almostThere.length === 1 ? "" : "s"} you can almost make (80%+ of ingredients on hand)`
            : "Add a few more staples to see recipes you can almost make ✨"}
        </p>
      )}

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
          {STAPLE_CATEGORIES.map((c) => (
            <option key={c.category} value={c.category}>
              {c.category}
            </option>
          ))}
          <option value="Other">Other</option>
        </select>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1 rounded-full bg-gradient-to-r from-sage-dark to-sage px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
        >
          <Plus size={14} /> Add
        </button>
      </form>

      <div className="flex flex-col gap-6">
        {STAPLE_CATEGORIES.map(({ category, emoji, items: staples }) => {
          const custom = customItemsByCategory.get(category) ?? [];
          return (
            <section key={category}>
              <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-sage-dark">
                <span>{emoji}</span> {category}
              </h2>
              <div className="flex flex-wrap gap-2">
                {staples.map((name) => {
                  const active = hasItem(name);
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleStaple(name, category)}
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

        {otherCategories.map((cat) => (
          <section key={cat}>
            <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-semibold text-sage-dark">
              <span>🥄</span> {cat}
            </h2>
            <div className="flex flex-wrap gap-2">
              {(customItemsByCategory.get(cat) ?? []).map((item) => (
                <span
                  key={item.id}
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
        ))}
      </div>
    </div>
  );
}
