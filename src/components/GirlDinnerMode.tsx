"use client";

import { X } from "lucide-react";

import { RecipeThumbnail } from "./RecipeThumbnail";
import { useRecipeModal } from "./RecipeModalProvider";
import { openDoorDashWithFallback, trackAffiliateClick } from "@/lib/delivery";
import { GIRL_DINNER_STAPLES } from "@/lib/girlDinnerStaples";
import type { RecipeDto } from "@/lib/types";

function handleOrderDoorDash() {
  trackAffiliateClick({ retailer: "doordash", source: "girl_dinner", ingredientCount: 0 });
  openDoorDashWithFallback();
}

export function GirlDinnerMode({ recipes, onClose }: { recipes: RecipeDto[]; onClose: () => void }) {
  const openRecipe = useRecipeModal();

  return (
    <div className="overlay-fade-in fixed inset-0 z-50 flex flex-col overflow-y-auto bg-gradient-to-b from-blush via-blush-soft to-cream">
      <div className="flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close girl dinner"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-rose-deep shadow-sm transition hover:bg-white"
        >
          <X size={18} />
        </button>
        <span className="font-serif text-lg font-semibold text-rose-deep">Girl Dinner 🍓</span>
        <span className="w-9" />
      </div>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-5 py-6">
        <p className="text-center font-serif text-base italic text-dusty-rose">
          &ldquo;a collection of little things. no rules, no cooking required, just vibes ✨&rdquo;
        </p>

        {recipes.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-serif text-lg font-semibold text-rose-deep">From your saves 🍓</h2>
            <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
              {recipes.map((recipe) => (
                <button
                  key={recipe.id}
                  type="button"
                  onClick={() => openRecipe(recipe)}
                  className="w-36 shrink-0 overflow-hidden rounded-2xl bg-white/80 text-left shadow-[0_8px_24px_-12px_rgba(192,120,140,0.45)] ring-1 ring-blush-dark/40 transition hover:-translate-y-0.5"
                >
                  <div className="relative aspect-[4/5] w-full bg-blush-soft">
                    <RecipeThumbnail src={recipe.thumbnailUrl} alt={recipe.title} className="h-full w-full" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-coral/30 via-blush/10 to-transparent" />
                  </div>
                  <p className="line-clamp-2 p-2.5 font-serif text-sm leading-snug font-semibold text-rose-deep">
                    {recipe.title}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="font-serif text-lg font-semibold text-rose-deep">Classic girl dinner energy 🧀</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {GIRL_DINNER_STAPLES.map((staple) => (
              <div
                key={staple.name}
                className="flex flex-col items-center gap-1.5 rounded-2xl bg-white/70 p-4 text-center shadow-[0_8px_24px_-14px_rgba(192,120,140,0.4)]"
              >
                <span className="text-3xl">{staple.emoji}</span>
                <p className="font-serif text-sm leading-snug font-semibold text-rose-deep">{staple.name}</p>
                <p className="text-[11px] text-dusty-rose italic">{staple.line}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-col items-center gap-3 border-t border-blush-dark/40 pt-6 text-center">
          <p className="font-serif text-sm font-semibold text-rose-deep">
            Not feeling like cooking at all?
            <br />
            No judgment, bestie 🌸
          </p>
          <button
            type="button"
            onClick={handleOrderDoorDash}
            className="w-full rounded-full bg-gradient-to-r from-[#FF3008] to-[#e02200] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
          >
            Just order DoorDash 🛵
          </button>
          <p className="font-serif text-xs italic text-dusty-rose">
            &ldquo;sometimes girl dinner is letting someone else cook&rdquo; ✨
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mx-auto mt-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
        >
          Back to homepage 🌸
        </button>
      </div>
    </div>
  );
}
