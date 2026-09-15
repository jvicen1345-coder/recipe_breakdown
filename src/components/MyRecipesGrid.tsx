"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpDown, Loader2, Plus, Search, Sparkles, X } from "lucide-react";

import { EmojiPickerSheet } from "./EmojiPickerSheet";
import { useProUpsell } from "./ProUpsellProvider";
import { RecipeCard } from "./RecipeCard";
import { useToast } from "./ToastProvider";
import { getCookedTimestamps } from "@/lib/clientState";
import { MY_RECIPES_FILTERS, matchesCookTonightFilter } from "@/lib/cookTonightFilters";
import { DEFAULT_FOLDER_EMOJI } from "@/lib/emojiData";
import type { FolderDto, RecipeDto } from "@/lib/types";

const PAGE_SIZE = 24;

type SortOption = "recent" | "az" | "time" | "cost";

const SORT_ORDER: SortOption[] = ["recent", "az", "time", "cost"];
const SORT_LABELS: Record<SortOption, string> = {
  recent: "Recently Added",
  az: "A–Z",
  time: "Cook Time",
  cost: "Cost",
};

export function MyRecipesGrid({
  initialRecipes,
  initialFolders,
  isPro = false,
  myRecipeCount = 0,
  freeRecipeLimit = 10,
}: {
  initialRecipes: RecipeDto[];
  initialFolders: FolderDto[];
  isPro?: boolean;
  myRecipeCount?: number;
  freeRecipeLimit?: number;
}) {
  const recipes = initialRecipes;
  const [folders, setFolders] = useState(initialFolders);
  const openUpsell = useProUpsell();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [sort, setSort] = useState<SortOption>("recent");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderEmoji, setNewFolderEmoji] = useState(DEFAULT_FOLDER_EMOJI);
  const [emojiPickerTarget, setEmojiPickerTarget] = useState<"new" | string | null>(null);
  const [smartMatchIds, setSmartMatchIds] = useState<string[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const searchRequestId = useRef(0);
  const showToast = useToast();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting pagination whenever the active filter/search/sort changes
    setVisibleCount(PAGE_SIZE);
  }, [search, activeFilter, folderFilter, sort]);

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
      const matchesActiveFilter = activeFilter === "all" || matchesCookTonightFilter(recipe, activeFilter);
      const matchesFolder = folderFilter === "all" || recipe.folderId === folderFilter;
      if (!matchesActiveFilter || !matchesFolder) return false;
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
        case "az":
          return a.title.localeCompare(b.title);
        case "time":
          return (a.totalTimeMinutes ?? Infinity) - (b.totalTimeMinutes ?? Infinity);
        case "cost":
          return (a.estimatedPriceUsd ?? Infinity) - (b.estimatedPriceUsd ?? Infinity);
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [recipes, search, activeFilter, folderFilter, sort, isSmartSearch, smartMatchIds]);

  function cycleSort() {
    setSort((prev) => SORT_ORDER[(SORT_ORDER.indexOf(prev) + 1) % SORT_ORDER.length]);
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName.trim(), emoji: newFolderEmoji }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setFolders((prev) => [...prev, data.folder]);
      setNewFolderName("");
      setCreatingFolder(false);
      showToast(`Folder "${data.folder.name}" created 🗂️`);
    } else if (data?.reason === "folder-limit") {
      openUpsell("folder-limit");
    } else {
      showToast(data?.error ?? "Couldn't create that folder.");
    }
  }

  async function handleChangeFolderEmoji(folderId: string, emoji: string) {
    const res = await fetch(`/api/folders/${folderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji }),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) {
      setFolders((prev) => prev.map((f) => (f.id === folderId ? data.folder : f)));
    } else {
      showToast(data?.error ?? "Couldn't update that folder's emoji.");
    }
  }

  function handleEmojiPicked(emoji: string) {
    if (emojiPickerTarget === "new") {
      setNewFolderEmoji(emoji);
    } else if (emojiPickerTarget) {
      handleChangeFolderEmoji(emojiPickerTarget, emoji);
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
    } else {
      const data = await res.json().catch(() => null);
      showToast(data?.error ?? "Couldn't delete that folder.");
    }
  }

  if (recipes.length === 0) {
    return (
      <div className="page-fade-in mx-auto flex w-full max-w-3xl flex-col items-center gap-3 px-4 py-16 text-center">
        <span className="text-5xl">🥣</span>
        <h1 className="font-serif text-2xl font-semibold text-rose-deep">Your recipe box is empty 🌸</h1>
        <p className="text-sm text-dusty-rose">Head home to paste your first TikTok link ✨</p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
        >
          Go save something →
        </Link>
      </div>
    );
  }

  const showGhostCard = filteredRecipes.length <= visibleCount && filteredRecipes.length % 2 === 1;

  return (
    <div className="page-fade-in mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="font-serif text-2xl font-semibold text-rose-deep">Your Recipes</h1>
        <div className="flex items-center gap-2">
          {!isPro && (
            <button
              type="button"
              onClick={() => openUpsell("recipe-limit")}
              className="rounded-full bg-blush px-2.5 py-1 text-[11px] font-medium text-rose-deep shadow-sm transition hover:-translate-y-0.5 hover:bg-blush-dark"
            >
              {myRecipeCount}/{freeRecipeLimit} recipes saved
            </button>
          )}
          <span className="text-xs text-dusty-rose">{recipes.length} saved 🌸</span>
        </div>
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

      <div className="flex flex-wrap items-center gap-2">
        {MY_RECIPES_FILTERS.map((filter) => {
          const active = activeFilter === filter.value;
          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-gradient-to-r from-coral to-rose-deep text-white shadow-md"
                  : "bg-blush text-rose-deep shadow-[0_2px_6px_-1px_rgba(192,120,140,0.35)] hover:-translate-y-0.5 hover:bg-blush-dark hover:shadow-[0_4px_10px_-1px_rgba(192,120,140,0.45)]"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={cycleSort}
          className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-medium text-rose-deep shadow-[0_2px_6px_-1px_rgba(192,120,140,0.35)] ring-1 ring-blush-dark/40 transition hover:-translate-y-0.5 hover:shadow-[0_4px_10px_-1px_rgba(192,120,140,0.45)]"
        >
          <ArrowUpDown size={13} /> {SORT_LABELS[sort]}
        </button>
      </div>

      <div className="no-scrollbar flex flex-wrap items-center gap-2">
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEmojiPickerTarget(folder.id);
              }}
              aria-label={`Change ${folder.name}'s emoji`}
              className="py-1.5 transition hover:scale-110"
            >
              {folder.emoji || DEFAULT_FOLDER_EMOJI}
            </button>
            <button type="button" onClick={() => setFolderFilter(folder.id)} className="py-1.5">
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
            <button
              type="button"
              onClick={() => setEmojiPickerTarget("new")}
              aria-label="Choose folder emoji"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-blush-soft text-base transition hover:scale-110"
            >
              {newFolderEmoji}
            </button>
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

      {filteredRecipes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-blush-dark p-12 text-center text-dusty-rose">
          {isSmartSearch
            ? `Nothing matched "${search.trim()}" — try rephrasing! ✨`
            : "No recipes match your search/filter — try something else! ✨"}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
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
            {showGhostCard && (
              <a
                href="https://www.tiktok.com/tag/recipe"
                target="_blank"
                rel="noreferrer"
                style={{ animationDelay: `${Math.min(filteredRecipes.length, 20) * 50}ms` }}
                className="card-fade-in flex min-w-0 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-blush-dark bg-white/40 p-6 text-center transition hover:-translate-y-1 hover:border-coral hover:bg-white/70"
              >
                <span className="text-3xl">✨</span>
                <p className="font-serif text-base font-semibold text-rose-deep">Add recipe</p>
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

      {emojiPickerTarget && (
        <EmojiPickerSheet
          value={
            emojiPickerTarget === "new"
              ? newFolderEmoji
              : (folders.find((f) => f.id === emojiPickerTarget)?.emoji ?? DEFAULT_FOLDER_EMOJI)
          }
          onSelect={handleEmojiPicked}
          onClose={() => setEmojiPickerTarget(null)}
        />
      )}
    </div>
  );
}
