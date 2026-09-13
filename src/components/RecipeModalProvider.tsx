"use client";

import { createContext, useContext, useState } from "react";

import { RecipeDetailModal } from "./RecipeDetailModal";
import type { RecipeDto } from "@/lib/types";

const RecipeModalContext = createContext<((recipe: RecipeDto) => void) | null>(null);

export function useRecipeModal() {
  const openRecipe = useContext(RecipeModalContext);
  if (!openRecipe) {
    throw new Error("useRecipeModal must be used within a RecipeModalProvider");
  }
  return openRecipe;
}

export function RecipeModalProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<RecipeDto | null>(null);

  return (
    <RecipeModalContext.Provider value={setSelected}>
      {children}
      {selected && (
        <RecipeDetailModal
          key={selected.id}
          recipe={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </RecipeModalContext.Provider>
  );
}
