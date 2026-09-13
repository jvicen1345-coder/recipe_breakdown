"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";

import { getFavoriteIds, toggleFavorite } from "@/lib/clientState";

export function FavoriteButton({ recipeId, className }: { recipeId: string; className?: string }) {
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring from localStorage, unavailable during SSR
    setFavorited(getFavoriteIds().has(recipeId));
  }, [recipeId]);

  function toggle(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    setFavorited(toggleFavorite(recipeId));
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
