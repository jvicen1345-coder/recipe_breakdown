"use client";

import { useState } from "react";
import { ExternalLink, X } from "lucide-react";

import { useToast } from "./ToastProvider";
import {
  DELIVERY_COMMISSION_DISCLOSURE,
  DELIVERY_PROVIDER_META,
  deliverySearchUrl,
  type DeliveryProvider,
} from "@/lib/delivery";
import type { RecipeDto } from "@/lib/types";

// Phase 2 of delivery integration: no pantry cross-referencing here (that's Smart
// Cart's job) — just a per-ingredient search hand-off to whichever store the user
// picks, logged once so it can count toward the nutrition snapshot's order tag.
export function ShopRecipeSheet({ recipe, onClose }: { recipe: RecipeDto; onClose: () => void }) {
  const [provider, setProvider] = useState<DeliveryProvider | null>(null);
  const showToast = useToast();

  function choose(p: DeliveryProvider) {
    setProvider(p);
    fetch("/api/cart/order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: p,
        items: recipe.ingredients.map((ing) => ing.item),
        recipeId: recipe.id,
      }),
    }).catch(() => {
      // Best-effort logging — the search links below still work either way.
    });
  }

  function handleSearchClick() {
    showToast("Opening search 🔎");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-rose-deep/30 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[2rem] bg-white p-6 shadow-[0_-20px_60px_-20px_rgba(192,120,140,0.5)] sm:rounded-[2rem] sm:shadow-[0_30px_70px_-25px_rgba(192,120,140,0.6)]">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-rose-deep">Shop this recipe 🛒</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-dusty-rose hover:bg-blush-soft"
          >
            <X size={16} />
          </button>
        </div>

        {!provider ? (
          <>
            <p className="text-sm text-dusty-rose">Where should we search for these ingredients?</p>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(DELIVERY_PROVIDER_META) as DeliveryProvider[]).map((p) => {
                const meta = DELIVERY_PROVIDER_META[p];
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => choose(p)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl px-4 py-5 text-sm font-semibold shadow-md transition hover:-translate-y-0.5 ${meta.badgeClassName}`}
                  >
                    <span className="text-2xl">{meta.emoji}</span>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <p className="text-xs font-medium text-dusty-rose">
              We&apos;ll search each ingredient for you — powered by {DELIVERY_PROVIDER_META[provider].label}
            </p>
            <ul className="flex flex-col gap-1.5">
              {recipe.ingredients.map((ing, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-blush/40 px-4 py-2.5 text-sm"
                >
                  <span className="text-foreground">
                    {ing.quantity && <span className="font-semibold text-rose-deep">{ing.quantity} </span>}
                    {ing.item}
                  </span>
                  <a
                    href={deliverySearchUrl(provider, ing.item)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={handleSearchClick}
                    className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-coral to-rose-deep px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:brightness-105"
                  >
                    Search <ExternalLink size={11} />
                  </a>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setProvider(null)}
              className="self-start text-xs font-medium text-dusty-rose/80 underline-offset-2 hover:underline"
            >
              ← choose a different store
            </button>
          </>
        )}

        <p className="text-[11px] text-dusty-rose/70">{DELIVERY_COMMISSION_DISCLOSURE}</p>
      </div>
    </div>
  );
}
