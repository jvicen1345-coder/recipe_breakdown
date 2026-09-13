"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import { FavoriteButton } from "./FavoriteButton";
import { RecipeDetailContent } from "./RecipeDetailContent";
import { RecipeThumbnail } from "./RecipeThumbnail";
import { recordRecipeViewed } from "@/lib/clientState";
import type { RecipeDto } from "@/lib/types";

export function RecipeDetailModal({ recipe, onClose }: { recipe: RecipeDto; onClose: () => void }) {
  useEffect(() => {
    recordRecipeViewed(recipe.id);
  }, [recipe.id]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative flex w-full max-w-2xl flex-col overflow-hidden bg-cream shadow-2xl sm:my-8 sm:rounded-[2rem]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative h-64 w-full overflow-hidden bg-blush-soft sm:h-80">
          <div aria-hidden className="absolute inset-0">
            <RecipeThumbnail
              src={recipe.thumbnailUrl}
              alt=""
              className="h-full w-full scale-125 opacity-60 blur-2xl"
            />
          </div>
          <div className="absolute inset-6 overflow-hidden rounded-3xl shadow-xl ring-4 ring-white/70 sm:inset-10">
            <RecipeThumbnail src={recipe.thumbnailUrl} alt={recipe.title} className="h-full w-full" />
          </div>
          <FavoriteButton recipeId={recipe.id} className="absolute top-3 right-14 z-10" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 text-rose-deep shadow-sm backdrop-blur-sm transition hover:scale-110"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
          <RecipeDetailContent recipe={recipe} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}
