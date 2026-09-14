"use client";

import { useEffect, useState } from "react";
import { Refrigerator, ShoppingCart } from "lucide-react";

import { GroceryList } from "./GroceryList";
import { usePantryOnboarding } from "./PantryOnboardingProvider";
import { PantryPageClient } from "./PantryPageClient";
import { usePlan } from "./PlanProvider";
import { QuickRefreshSheet } from "./QuickRefreshSheet";
import type { RecipeDto } from "@/lib/types";

type Tab = "grocery" | "pantry";

const TABS: { value: Tab; label: string; icon: typeof ShoppingCart }[] = [
  { value: "grocery", label: "Grocery List", icon: ShoppingCart },
  { value: "pantry", label: "My Pantry", icon: Refrigerator },
];

export function GroceryPantryPage({ recipes }: { recipes: RecipeDto[] }) {
  const [tab, setTab] = useState<Tab>("grocery");
  const [showQuickRefresh, setShowQuickRefresh] = useState(false);
  const { pantryOnboardedAt, loading } = usePlan();
  const openPantryOnboarding = usePantryOnboarding();

  useEffect(() => {
    if (!loading && !pantryOnboardedAt) openPantryOnboarding();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only fire once plan data has loaded
  }, [loading, pantryOnboardedAt]);

  return (
    <div className="page-fade-in mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
      <div className="inline-flex w-fit gap-1 self-center rounded-full bg-white/60 p-1 sm:self-start">
        {TABS.map(({ value, label, icon: Icon }) => {
          const active = tab === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                active ? "bg-sage-dark text-white shadow-md" : "text-sage-dark/70 hover:text-sage-dark"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          );
        })}
      </div>

      {tab === "grocery" ? (
        <GroceryList initialRecipes={recipes} onQuickRefresh={() => setShowQuickRefresh(true)} />
      ) : (
        <PantryPageClient recipes={recipes} />
      )}

      {showQuickRefresh && (
        <QuickRefreshSheet recipes={recipes} onClose={() => setShowQuickRefresh(false)} />
      )}
    </div>
  );
}
