"use client";

import { createContext, useContext, useEffect, useState } from "react";

import { getStalenessLevel, type StalenessLevel } from "@/lib/pantryStaleness";

interface PlanState {
  isPro: boolean;
  loading: boolean;
  groceryCadence: string | null;
  pantryOnboardedAt: string | null;
  pantryLastConfirmedAt: string | null;
  stalenessLevel: StalenessLevel;
  refresh: () => void;
}

const PlanContext = createContext<PlanState | null>(null);

export function usePlan() {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error("usePlan must be used within a PlanProvider");
  return ctx;
}

// A small client-side mirror of the session user's plan + pantry-cadence state — lets
// deeply nested components (Cook Mode's trigger, the delivery-cart buttons, the
// staleness nudges, …) read them without every server page prop-drilling it down
// through both the recipe modal and the full detail page separately.
export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [isPro, setIsPro] = useState(false);
  const [groceryCadence, setGroceryCadence] = useState<string | null>(null);
  const [pantryOnboardedAt, setPantryOnboardedAt] = useState<string | null>(null);
  const [pantryLastConfirmedAt, setPantryLastConfirmedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setIsPro(data?.user?.plan === "pro");
        setGroceryCadence(data?.user?.groceryCadence ?? null);
        setPantryOnboardedAt(data?.user?.pantryOnboardedAt ?? null);
        setPantryLastConfirmedAt(data?.user?.pantryLastConfirmedAt ?? null);
      })
      .catch(() => {
        // Enhancement layer for gating UI — defaults are safe (free plan, no pantry state).
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const value: PlanState = {
    isPro,
    loading,
    groceryCadence,
    pantryOnboardedAt,
    pantryLastConfirmedAt,
    stalenessLevel: getStalenessLevel(pantryLastConfirmedAt, groceryCadence),
    refresh: () => setNonce((n) => n + 1),
  };

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}
