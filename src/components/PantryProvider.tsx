"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useToast } from "./ToastProvider";
import type { PantryItemDto } from "@/lib/types";

interface PantryContextValue {
  items: PantryItemDto[];
  names: string[];
  loading: boolean;
  hasItem: (name: string) => boolean;
  addItem: (name: string, category: string) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  /** Re-fetches the full pantry list — used after bulk changes (onboarding, quick refresh). */
  refresh: () => Promise<void>;
}

const PantryContext = createContext<PantryContextValue | null>(null);

export function usePantry() {
  const ctx = useContext(PantryContext);
  if (!ctx) throw new Error("usePantry must be used within a PantryProvider");
  return ctx;
}

export function PantryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<PantryItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const showToast = useToast();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pantry");
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      // Pantry data is a nice-to-have enhancement layer; silently skip if it fails to load.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, not derivable from props/state
    load();
  }, [load]);

  const addItem = useCallback(
    async (name: string, category: string) => {
      const res = await fetch("/api/pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, category }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems((prev) => (prev.some((i) => i.id === data.item.id) ? prev : [...prev, data.item]));
      } else {
        const data = await res.json().catch(() => null);
        showToast(data?.error ?? "Couldn't add that to your pantry.");
      }
    },
    [showToast],
  );

  const removeItem = useCallback(
    async (id: string) => {
      const removed = items.find((i) => i.id === id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      const res = await fetch(`/api/pantry/${id}`, { method: "DELETE" });
      if (!res.ok && removed) {
        setItems((prev) => (prev.some((i) => i.id === id) ? prev : [...prev, removed]));
        const data = await res.json().catch(() => null);
        showToast(data?.error ?? "Couldn't remove that from your pantry.");
      }
    },
    [items, showToast],
  );

  const hasItem = useCallback(
    (name: string) => items.some((i) => i.name.toLowerCase() === name.toLowerCase()),
    [items],
  );

  const names = useMemo(() => items.map((i) => i.name), [items]);

  const value = useMemo(
    () => ({ items, names, loading, hasItem, addItem, removeItem, refresh: load }),
    [items, names, loading, hasItem, addItem, removeItem, load],
  );

  return <PantryContext.Provider value={value}>{children}</PantryContext.Provider>;
}
