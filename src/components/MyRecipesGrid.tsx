"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Plus, Search, Sparkles, X } from "lucide-react";

import { PillDropdown } from "./PillDropdown";
import { RecipeCard } from "./RecipeCard";
import { useToast } from "./ToastProvider";
import { getCookedTimestamps } from "@/lib/clientState";
import { COOK_TONIGHT_FILTER_LABELS, matchesCookTonightFilter } from "@/lib/cookTonightFilters";
import { DIET_LABELS } from "@/lib/format";
import type { FolderDto, RecipeDto } from "@/lib/types";

const DIET_FILTER_OPTIONS = [
  { value: "all", label: "All diets" },
  ...Object.entries(DIET_LABELS).map(([value, label]) => ({ value, label })),
];
const FOLDER_EMOJI_PRESETS = ["🕯️", "💪", "🍕", "🌸", "🎉", "🥗"];
const PAGE_SIZE = 24;

type SortOption = "recent" | "time" | "cost";

const SORT_LABELS: Record<SortOption, string> = {
  recent: "Recently Added",
  time: "Cook Time",
  cost: "Cost",
};
const SORT_OPTIONS = (Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => ({
  value,
  label,
}));

export function MyRecipesGrid({
  recipes,
  initialFolders,
  cookTonightFilters,
}: {
  recipes: RecipeDto[];
  initialFolders: FolderDto[];
  /** Active "Cook something tonight?" pills — recipes matching ANY of these stay in view. */
  cookTonightFilters: Set<string>;
}) {
  const [folders, setFolders] = useState(initialFolders);
  const [search, setSearch] = useState("");
  const [dietFilter, setDietFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [sort, setSort] = useState<SortOption>("recent");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderEmoji, setNewFolderEmoji] = useState(FOLDER_EMOJI_PRESETS[0]);
  const [smartMatchIds, setSmartMatchIds] = useState<string[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const searchRequestId = useRef(0);
  const showToast = useToast();

  // Only ever render a page's worth of cards at a time — with a large saved-recipe
  // library this keeps the initial DOM/image load light. Any change to which
  // recipes should be showing starts back at the first page.
  const cookTonightKey = [...cookTonightFilters].sort().join(",");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting pagination whenever the active filter/search/sort changes
    setVisibleCount(PAGE_SIZE);
  }, [search, dietFilter, folderFilter, sort, cookTonightKey]);

  // A search of 3+ characters is sent to the smart-search endpoint (debounced) so it
  // can match on ingredients/time/cost/diet/last-cooked, not just the title — but the
  // plain title/author substring match below stays live the whole time so results
  // never go blank while waiting on the network.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- invalidating stale AI results whenever the query changes
    setSmartMatchIds(null);
    const query = search.trim();
    if (query.length < 3 || recipes.length === 0) {
      setSearching(false);
      return;
    }
    setSearching(true);
    const requestId = ++searchRequestId.current;
    const timeout = setTimeout(async () => {
      try {
        const cookedTimestamps = getCookedTimestamps();
        const res = await fetch("/api/search-recipes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            recipes: recipes.map((recipe) => ({
              id: recipe.id,
              title: recipe.title,
              ingredients: recipe.ingredients.map((i) => i.item),
              dietType: recipe.dietType,
              proteinType: recipe.proteinType,
              difficulty: recipe.difficulty,
              totalTimeMinutes: recipe.totalTimeMinutes,
              priceLevel: recipe.priceLevel,
              estimatedPriceUsd: recipe.estimatedPriceUsd,
              caloriesPerServing: recipe.nutrition?.caloriesPerServing ?? null,
              daysSinceCooked: cookedTimestamps[recipe.id]
                ? Math.floor((Date.now() - new Date(cookedTimestamps[recipe.id]).getTime()) / 86_400_000)
                : null,
            })),
          }),
        });
        if (requestId !== searchRequestId.current) return;
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        setSmartMatchIds(Array.isArray(data.matchingIds) ? data.matchingIds : []);
      } catch {
        if (requestId === searchRequestId.current) setSmartMatchIds(null);
      } finally {
        if (requestId === searchRequestId.current) setSearching(false);
      }
    }, 600);
    return () => clearTimeout(timeout);
  }, [search, recipes]);

  const isSmartSearch = smartMatchIds !== null && search.trim().length >= 3;

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matching = recipes.filter((recipe) => {
      const matchesDiet = dietFilter === "all" || recipe.dietType === dietFilter;
      const matchesFolder = folderFilter === "all" || recipe.folderId === folderFilter;
      const matchesCookTonight =
        cookTonightFilters.size === 0 ||
        [...cookTonightFilters].some((filter) => matchesCookTonightFilter(recipe, filter));
      if (!matchesDiet || !matchesFolder || !matchesCookTonight) return false;
      if (isSmartSearch) return smartMatchIds!.includes(recipe.id);
      return (
        !query ||
        recipe.title.toLowerCase().includes(query) ||
        recipe.authorHandle?.toLowerCase().includes(query)
      );
    });

    if (isSmartSearch) {
      const order = new Map(smartMatchIds!.map((id, i) => [id, i]));
      return [...matching].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }

    return [...matching].sort((a, b) => {
      switch (sort) {
        case "time":
          return (a.totalTimeMinutes ?? Infinity) - (b.totalTimeMinutes ?? Infinity);
        case "cost":
          return (a.estimatedPriceUsd ?? Infinity) - (b.estimatedPriceUsd ?? Infinity);
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cookTonightFilters is a Set; cookTonightKey is its stable dependency
  }, [recipes, search, dietFilter, folderFilter, sort, isSmartSearch, smartMatchIds, cookTonightKey]);

  const filterSummary = isSmartSearch
    ? `Smart matches for "${search.trim()}"`
    : (() => {
        const parts: string[] = [];
        if (folderFilter !== "all") {
          const folder = folders.find((f) => f.id === folderFilter);
          if (folder) parts.push(`in ${folder.emoji ? `${folder.emoji} ` : ""}${folder.name}`);
        }
        if (dietFilter !== "all") {
          const diet = DIET_FILTER_OPTIONS.find((o) => o.value === dietFilter);
          if (diet) parts.push(diet.label);
        }
        if (cookTonightFilters.size > 0) {
          parts.push([...cookTonightFilters].map((f) => COOK_TONIGHT_FILTER_LABELS[f]).join(" or "));
        }
        if (sort !== "recent") parts.push(`sorted by ${SORT_LABELS[sort]}`);
        const count = `${filteredRecipes.length} recipe${filteredRecipes.length === 1 ? "" : "s"}`;
        return parts.length > 0 ? `Showing ${count} · ${parts.join(" · ")}` : `Showing all ${count}`;
      })();

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim(), emoji: newFolderEmoji }),
    });
    if (res.ok) {
      const data = await res.json();
      setFolders((prev) => [...prev, data.folder]);
      setNewFolderName("");
      setCreatingFolder(false);
      showToast(`Folder "${data.folder.name}" created 🗂️`);
    }
  }

  async function handleDeleteFolder(e: React.MouseEvent, folderId: string, folderName: string) {
    e.stopPropagation();
    if (!confirm(`Delete the "${folderName}" folder? Recipes in it won't be deleted.`)) return;
    const res = await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
    if (res.ok) {
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setFolderFilter((prev) => (prev === folderId ? "all" : prev));
      showToast(`Folder "${folderName}" deleted 🗑️`);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-xl font-semibold text-rose-deep">Your Recipes</h2>
        <span className="text-xs text-dusty-rose">{recipes.length} saved</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFolderFilter("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            folderFilter === "all"
              ? "bg-rose-deep text-white shadow-md"
              : "bg-blush text-rose-deep shadow-[0_2px_6px_-1px_rgba(192,120,140,0.35)] hover:-translate-y-0.5 hover:bg-blush-dark hover:shadow-[0_4px_10px_-1px_rgba(192,120,140,0.45)]"
          }`}
        >
          All
        </button>
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`group/folder flex items-center gap-1 rounded-full pr-1 pl-4 text-sm font-medium transition ${
              folderFilter === folder.id
                ? "bg-rose-deep text-white shadow-md"
                : "bg-blush text-rose-deep shadow-[0_2px_6px_-1px_rgba(192,120,140,0.35)] hover:shadow-[0_4px_10px_-1px_rgba(192,120,140,0.45)]"
            }`}
          >
            <button type="button" onClick={() => setFolderFilter(folder.id)} className="py-1.5">
              {folder.emoji ? `${folder.emoji} ` : ""}
              {folder.name}
            </button>
            <button
              type="button"
              onClick={(e) => handleDeleteFolder(e, folder.id, folder.name)}
              aria-label={`Delete ${folder.name} folder`}
              className={`flex h-5 w-5 items-center justify-center rounded-full transition ${
                folderFilter === folder.id
                  ? "text-white/70 hover:bg-white/20 hover:text-white"
                  : "text-dusty-rose/60 hover:bg-blush-dark hover:text-coral-deep"
              }`}
            >
              <X size={12} />
            </button>
          </div>
        ))}
        {creatingFolder ? (
          <form
            onSubmit={handleCreateFolder}
            className="flex items-center gap-1.5 rounded-full bg-white px-2 py-1 shadow-sm ring-1 ring-blush-dark/50"
          >
            <select
              value={newFolderEmoji}
              onChange={(e) => setNewFolderEmoji(e.target.value)}
              className="rounded-full bg-transparent text-sm outline-none"
            >
              {FOLDER_EMOJI_PRESETS.map((emoji) => (
                <option key={emoji} value={emoji}>
                  {emoji}
                </option>
              ))}
            </select>
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-28 bg-transparent text-sm outline-none"
            />
            <button type="submit" className="rounded-full bg-coral px-2 py-1 text-xs font-semibold text-white">
              Add
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setCreatingFolder(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-blush-dark bg-white/50 px-4 py-1.5 text-sm font-medium text-dusty-rose shadow-sm transition hover:-translate-y-0.5 hover:border-coral hover:text-coral-deep hover:shadow-md"
          >
            <Plus size={13} /> New Folder
          </button>
        )}
      </div>

      <div className="relative">
        {searching ? (
          <Loader2
            size={16}
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 animate-spin text-coral"
          />
        ) : isSmartSearch ? (
          <Sparkles size={16} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-coral" />
        ) : (
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-dusty-rose"
          />
        )}
        <input
          id="recipe-search-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search, or ask e.g. 'quick chicken dinner'…"
          className="w-full rounded-full border border-blush-dark/60 bg-white py-2.5 pr-4 pl-10 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <PillDropdown
          label=""
          value={dietFilter}
          options={DIET_FILTER_OPTIONS}
          onChange={setDietFilter}
          active={dietFilter !== "all"}
        />
        <PillDropdown
          label="Sort: "
          value={sort}
          options={SORT_OPTIONS}
          onChange={setSort}
          active={sort !== "recent"}
        />
      </div>

      {recipes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-blush-dark p-16 text-center text-dusty-rose">
          <span className="text-4xl">🌸</span>
          <p className="font-serif text-lg text-rose-deep">Your recipe box is empty</p>
          <p className="text-sm">Paste a link above to fill it up ✨</p>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-blush-dark p-12 text-center text-dusty-rose">
          {isSmartSearch
            ? `Nothing matched "${search.trim()}" — try rephrasing! ✨`
            : "No recipes match your search/filter — try something else! ✨"}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-dusty-rose">
            {isSmartSearch && <Sparkles size={11} className="mr-1 inline -translate-y-px" />}
            {filterSummary}
          </p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filteredRecipes.slice(0, visibleCount).map((recipe, i) => (
              <div
                key={recipe.id}
                className="card-fade-in min-w-0"
                style={{ animationDelay: `${Math.min(i, 20) * 50}ms` }}
              >
                <RecipeCard recipe={recipe} showQuickActions />
              </div>
            ))}
            {filteredRecipes.length <= visibleCount && (
              <a
                href="https://www.tiktok.com/tag/recipe"
                target="_blank"
                rel="noreferrer"
                style={{ animationDelay: `${Math.min(filteredRecipes.length, 20) * 50}ms` }}
                className="card-fade-in flex min-w-0 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-blush-dark bg-white/40 p-6 text-center transition hover:-translate-y-1 hover:border-coral hover:bg-white/70"
              >
                <span className="text-3xl">✨</span>
                <p className="font-serif text-base font-semibold text-rose-deep">Add new recipes, girly</p>
                <p className="text-xs text-dusty-rose">Find something on TikTok →</p>
              </a>
            )}
          </div>
          {filteredRecipes.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
              className="self-center rounded-full bg-blush px-6 py-2.5 text-sm font-medium text-rose-deep shadow-sm transition hover:-translate-y-0.5 hover:bg-blush-dark hover:shadow-md"
            >
              Load More 🌸 ({filteredRecipes.length - visibleCount} more)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
