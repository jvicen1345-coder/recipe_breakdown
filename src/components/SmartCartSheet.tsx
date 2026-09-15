"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import type { GroceryItem } from "./GroceryList";
import { useToast } from "./ToastProvider";
import { DELIVERY_COMMISSION_DISCLOSURE, instacartSearchUrl } from "@/lib/delivery";
import { ingredientInPantry } from "@/lib/pantryMatch";

// Phase 3, "the differentiator": cross-references the pantry so the cart only ever
// includes what's actually missing, then hands that list to Instacart. Pantry
// staleness is checked by the caller (GroceryList) before this sheet ever opens.
export function SmartCartSheet({
  items,
  pantryNames,
  onClose,
}: {
  items: GroceryItem[];
  pantryNames: string[];
  onClose: () => void;
}) {
  const showToast = useToast();
  const [sending, setSending] = useState(false);

  const missingItems = useMemo(
    () => items.filter((i) => !ingredientInPantry(i.item, pantryNames)),
    [items, pantryNames],
  );
  const savedCount = items.length - missingItems.length;

  const [checked, setChecked] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(missingItems.map((i) => [i.key, true])),
  );

  function toggle(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !(prev[key] ?? true) }));
  }

  const selected = missingItems.filter((i) => checked[i.key] ?? true);

  async function handleSend() {
    if (selected.length === 0) return;
    setSending(true);
    try {
      selected.forEach((item, idx) => {
        setTimeout(() => {
          window.open(instacartSearchUrl(item.item), "_blank");
        }, idx * 200);
      });

      const contributingRecipeIds = [...new Set(selected.map((i) => i.recipeId))];
      const res = await fetch("/api/cart/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "instacart",
          items: selected.map((i) => i.item),
          contributingRecipeIds,
          pantrySavedCount: savedCount,
          source: "smart_cart",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast(data?.error ?? "Couldn't send your cart — try again.");
        return;
      }
      showToast("Sent to Instacart 🛒");
      onClose();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-rose-deep/30 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[2rem] bg-white p-6 shadow-[0_-20px_60px_-20px_rgba(192,120,140,0.5)] sm:rounded-[2rem] sm:shadow-[0_30px_70px_-25px_rgba(192,120,140,0.6)]">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-sage-dark">Order what I need 🛒</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-sage-dark/60 hover:bg-sage/15"
          >
            <X size={16} />
          </button>
        </div>

        {missingItems.length === 0 ? (
          <p className="rounded-2xl bg-sage/15 px-4 py-4 text-sm text-sage-dark">
            You already have everything on your list — nothing to order! 🎉
          </p>
        ) : (
          <>
            <p className="text-sm text-sage-dark/80">
              We found {missingItems.length} missing ingredient{missingItems.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-col gap-1.5">
              {missingItems.map((item) => {
                const isChecked = checked[item.key] ?? true;
                return (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl bg-sage/10 px-4 py-2.5 text-sm"
                  >
                    <span className="relative flex h-5 w-5 shrink-0 items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggle(item.key)}
                        className="peer absolute inset-0 h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-sage bg-white transition checked:border-sage-dark checked:bg-sage-dark"
                      />
                      <Check size={12} className="pointer-events-none relative hidden text-white peer-checked:block" />
                    </span>
                    <span className="flex-1 text-sage-dark">
                      {item.quantity && <span className="font-semibold">{item.quantity} </span>}
                      {item.item}
                    </span>
                  </label>
                );
              })}
            </div>
            {savedCount > 0 && (
              <p className="rounded-2xl bg-sage/15 px-4 py-2.5 text-xs text-sage-dark">
                🧺 Your pantry saved you from buying {savedCount} ingredient{savedCount === 1 ? "" : "s"} you already
                have.
              </p>
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || selected.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sage-dark to-sage px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {sending && <Loader2 size={15} className="animate-spin" />}
              Sending to Instacart →
            </button>
            <p className="text-[11px] text-sage-dark/60">{DELIVERY_COMMISSION_DISCLOSURE}</p>
          </>
        )}
      </div>
    </div>
  );
}
