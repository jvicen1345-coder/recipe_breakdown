"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

const STORAGE_KEY = "recipe-favorites";

function loadFavorites(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

export function FavoriteButton({ recipeId, className }: { recipeId: string; className?: string }) {
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from localStorage, unavailable during SSR
    setFavorited(loadFavorites().has(recipeId));
  }, [recipeId]);

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setFavorited((prev) => {
      const next = !prev;
      const favorites = loadFavorites();
      if (next) favorites.add(recipeId);
      else favorites.delete(recipeId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
      } catch {
        // localStorage can throw in private-browsing contexts; favorite just won't persist.
      }
      return next;
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={favorited ? "Remove from favorites" : "Save to favorites"}
      aria-pressed={favorited}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/85 shadow-sm backdrop-blur-sm transition hover:scale-110 active:scale-95 ${className ?? ""}`}
    >
      <Heart
        size={16}
        className={favorited ? "fill-coral-deep text-coral-deep" : "text-dusty-rose"}
      />
    </button>
  );
}
