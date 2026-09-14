"use client";

import { useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";

import { RecipeCard } from "./RecipeCard";
import { useToast } from "./ToastProvider";
import { DIET_LABELS } from "@/lib/format";
import type { FolderDto, RecipeDto } from "@/lib/types";

const DIET_FILTER_OPTIONS = Object.entries(DIET_LABELS);
const FOLDER_EMOJI_PRESETS = ["🕯️", "💪", "🍕", "🌸", "🎉", "🥗"];

type SortOption = "recent" | "az" | "time" | "cost";

const SORT_LABELS: Record<SortOption, string> = {
  recent: "Recently Added",
  az: "A–Z",
  time: "Cook Time",
  cost: "Cost",
};

export function MyRecipesGrid({
  recipes,
  initialFolders,
}: {
  recipes: RecipeDto[];
  initialFolders: FolderDto[];
}) {
  const [folders, setFolders] = useState(initialFolders);
  const [search, setSearch] = useState("");
  const [dietFilter, setDietFilter] = useState("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [sort, setSort] = useState<SortOption>("recent");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderEmoji, setNewFolderEmoji] = useState(FOLDER_EMOJI_PRESETS[0]);
  const showToast = useToast();

  const filteredRecipes = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matching = recipes.filter((recipe) => {
      const matchesSearch =
        !query ||
        recipe.title.toLowerCase().includes(query) ||
        recipe.authorHandle?.toLowerCase().includes(query);
      const matchesDiet = dietFilter === "all" || recipe.dietType === dietFilter;
      const matchesFolder = folderFilter === "all" || recipe.folderId === folderFilter;
      return matchesSearch && matchesDiet && matchesFolder;
    });

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
  }, [recipes, search, dietFilter, folderFilter, sort]);

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

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-dusty-rose"
          />
          <input
            id="recipe-search-input"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your recipes…"
            className="w-full rounded-full border border-blush-dark/60 bg-white py-2.5 pr-4 pl-10 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
          />
        </div>
        <select
          value={dietFilter}
          onChange={(e) => setDietFilter(e.target.value)}
          className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
        >
          <option value="all">All diets</option>
          {DIET_FILTER_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/30"
        >
          {(Object.entries(SORT_LABELS) as [SortOption, string][]).map(([value, label]) => (
            <option key={value} value={value}>
              Sort: {label}
            </option>
          ))}
        </select>
      </div>

      {recipes.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-blush-dark p-16 text-center text-dusty-rose">
          <span className="text-4xl">🌸</span>
          <p className="font-serif text-lg text-rose-deep">Your recipe box is empty</p>
          <p className="text-sm">Paste a link above to fill it up ✨</p>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-blush-dark p-12 text-center text-dusty-rose">
          No recipes match your search/filter — try something else! ✨
        </div>
      ) : (
        <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
          {filteredRecipes.map((recipe, i) => (
            <div
              key={recipe.id}
              className="card-fade-in mb-4 break-inside-avoid"
              style={{ animationDelay: `${Math.min(i, 20) * 50}ms` }}
            >
              <RecipeCard recipe={recipe} showQuickActions />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
