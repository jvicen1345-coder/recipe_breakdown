"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import { usePantry } from "./PantryProvider";
import { usePlan } from "./PlanProvider";
import { useToast } from "./ToastProvider";
import { PANTRY_CATEGORIES } from "@/lib/pantryCategories";

type Cadence = "weekly" | "biweekly" | "whenever";

const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every two weeks" },
  { value: "whenever", label: "Whenever" },
];

const PantryOnboardingContext = createContext<(() => void) | null>(null);

export function usePantryOnboarding() {
  const ctx = useContext(PantryOnboardingContext);
  if (!ctx) throw new Error("usePantryOnboarding must be used within a PantryOnboardingProvider");
  return ctx;
}

export function PantryOnboardingProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const showToast = useToast();
  const { refresh: refreshPantry } = usePantry();
  const { refresh: refreshPlan } = usePlan();

  const openOnboarding = useCallback(() => {
    setStep(1);
    setSelected(new Set());
    setOpen(true);
  }, []);

  function toggleItem(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleCadence(cadence: Cadence) {
    setSubmitting(true);
    try {
      const res = await fetch("/api/pantry/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [...selected], cadence }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast(data?.error ?? "Couldn't save your pantry — try again.");
        return;
      }
      setOpen(false);
      showToast("Kitchen all set! 🌸✨");
      await refreshPantry();
      refreshPlan();
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PantryOnboardingContext.Provider value={openOnboarding}>
      {children}
      {open && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-gradient-to-b from-cream via-blush-soft to-lavender/30">
          {step === 1 ? (
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10 sm:px-6">
              <div className="flex flex-col items-center gap-2 text-center">
                <span className="text-4xl">🏠</span>
                <h1 className="font-serif text-2xl font-semibold text-rose-deep sm:text-3xl">
                  Let&apos;s set up your kitchen
                </h1>
                <p className="text-sm text-dusty-rose">Tap everything you usually keep stocked ✨</p>
              </div>

              <div className="flex flex-col gap-6">
                {PANTRY_CATEGORIES.map((category) => (
                  <div key={category.key} className="flex flex-col gap-2.5">
                    <h2 className="text-sm font-semibold text-rose-deep">
                      {category.label} {category.emoji}
                    </h2>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {category.items.map((item) => {
                        const isSelected = selected.has(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => toggleItem(item)}
                            className={`flex items-center justify-between gap-2 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                              isSelected
                                ? "bg-sage text-white shadow-md"
                                : "bg-white/80 text-rose-deep shadow-[0_2px_8px_-2px_rgba(192,120,140,0.35)] hover:-translate-y-0.5 hover:shadow-md"
                            }`}
                          >
                            {item}
                            {isSelected && <Check size={16} className="shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="sticky bottom-4 mt-2 self-center rounded-full bg-gradient-to-r from-coral to-rose-deep px-8 py-3 text-sm font-semibold text-white shadow-[0_10px_30px_-10px_rgba(192,120,140,0.6)] transition hover:brightness-105"
              >
                Done — let&apos;s cook! 🌸
              </button>
            </div>
          ) : (
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
              <span className="text-4xl">🛍️</span>
              <div className="flex flex-col gap-2">
                <h1 className="font-serif text-2xl font-semibold text-rose-deep">How often do you grocery shop?</h1>
                <p className="text-sm text-dusty-rose">
                  This just paces how often we nudge you to double check your pantry.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2.5">
                {CADENCE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleCadence(option.value)}
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-rose-deep shadow-[0_2px_10px_-2px_rgba(192,120,140,0.4)] ring-1 ring-blush-dark/60 transition hover:-translate-y-0.5 hover:bg-blush-soft hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {submitting && <Loader2 size={15} className="animate-spin" />}
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </PantryOnboardingContext.Provider>
  );
}
