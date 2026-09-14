"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";

import { usePantry } from "./PantryProvider";
import { usePlan } from "./PlanProvider";
import { useToast } from "./ToastProvider";
import type { RecipeDto } from "@/lib/types";

// "Never send users to the full pantry page to update — that feels like homework."
// A yes/no check on a handful of recently-used staples, meant to take under 10 seconds.
export function QuickRefreshSheet({ recipes, onClose }: { recipes: RecipeDto[]; onClose: () => void }) {
  const { names: pantryNames, refresh: refreshPantry } = usePantry();
  const { refresh: refreshPlan } = usePlan();
  const showToast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const candidateItems = useMemo(() => {
    const recent = [...recipes]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
    const seen = new Set<string>();
    const items: string[] = [];
    for (const recipe of recent) {
      for (const ing of recipe.ingredients) {
        const lower = ing.item.trim().toLowerCase();
        if (!lower || seen.has(lower)) continue;
        if (!pantryNames.some((n) => n.toLowerCase() === lower)) continue;
        seen.add(lower);
        items.push(ing.item);
        if (items.length >= 6) break;
      }
      if (items.length >= 6) break;
    }
    return items;
  }, [recipes, pantryNames]);

  const [answers, setAnswers] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(candidateItems.map((item) => [item, true])),
  );

  async function handleSubmit() {
    setSubmitting(true);
    const confirmed = candidateItems.filter((item) => answers[item] ?? true);
    const removed = candidateItems.filter((item) => !(answers[item] ?? true));
    try {
      const res = await fetch("/api/pantry/quick-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed, removed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast(data?.error ?? "Couldn't refresh your pantry — try again.");
        return;
      }
      showToast("Pantry refreshed! ✨");
      await refreshPantry();
      refreshPlan();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-rose-deep/30 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-t-[2rem] bg-white p-6 shadow-[0_-20px_60px_-20px_rgba(192,120,140,0.5)] sm:rounded-[2rem] sm:shadow-[0_30px_70px_-25px_rgba(192,120,140,0.6)]">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl font-semibold text-sage-dark">Still have these? 👇</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-sage-dark/60 hover:bg-sage/15"
          >
            <X size={16} />
          </button>
        </div>

        {candidateItems.length === 0 ? (
          <p className="text-sm text-sage-dark/70">
            Nothing specific to check right now — we&apos;ll just mark your pantry as refreshed.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {candidateItems.map((item) => {
              const isYes = answers[item] ?? true;
              return (
                <div key={item} className="flex items-center justify-between rounded-2xl bg-sage/10 px-4 py-2.5">
                  <span className="text-sm font-medium text-sage-dark">{item}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, [item]: true }))}
                      aria-label={`Still have ${item}`}
                      className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                        isYes ? "bg-sage-dark text-white" : "bg-white text-sage-dark/50 ring-1 ring-sage/40"
                      }`}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, [item]: false }))}
                      aria-label={`Out of ${item}`}
                      className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                        !isYes ? "bg-coral text-white" : "bg-white text-sage-dark/50 ring-1 ring-sage/40"
                      }`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-sage-dark to-sage px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {submitting && <Loader2 size={15} className="animate-spin" />}
          Looks good! ✨
        </button>
      </div>
    </div>
  );
}
