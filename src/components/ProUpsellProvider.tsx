"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";

import { useToast } from "./ToastProvider";

export type UpsellReason =
  | "recipe-limit"
  | "folder-limit"
  | "cook-mode"
  | "recipe-swiper"
  | "nutrition-snapshot"
  | "smart-cart"
  | "general";

const UPSELL_COPY: Record<UpsellReason, { title: string; subtext: string }> = {
  "recipe-limit": {
    title: "Your recipe box is getting full 🌸",
    subtext:
      "Upgrade to Cutesy Eats Pro to save up to 100 recipes a month, unlock Cook Mode, and get smarter grocery lists that only order what you need.",
  },
  "folder-limit": {
    title: "Your folders are getting full 🌸",
    subtext: "Upgrade to Cutesy Eats Pro for unlimited folders, plus Cook Mode and smarter grocery lists.",
  },
  "cook-mode": {
    title: "Cook Mode is a Pro perk 🍳",
    subtext: "Upgrade to Cutesy Eats Pro to unlock hands-free, step-by-step Cook Mode — plus smarter grocery lists.",
  },
  "recipe-swiper": {
    title: "The recipe swiper is a Pro perk 🌙",
    subtext: "Upgrade to Cutesy Eats Pro to unlock the \"Cook Tonight?\" swiper, Cook Mode, and smarter grocery lists.",
  },
  "nutrition-snapshot": {
    title: "Weekly nutrition snapshots are a Pro perk 📊",
    subtext: "Upgrade to Cutesy Eats Pro to unlock your weekly snapshot, Cook Mode, and smarter grocery lists.",
  },
  "smart-cart": {
    title: "Smart Cart is a Pro perk 🛒",
    subtext:
      "Upgrade to Cutesy Eats Pro to order only what you're missing — we cross-check your pantry so you never over-buy.",
  },
  general: {
    title: "Unlock Cutesy Eats Pro ✨",
    subtext: "Save up to 100 recipes a month, unlock Cook Mode, and get smarter grocery lists that only order what you need.",
  },
};

interface ProUpsellContextValue {
  openUpsell: (reason?: UpsellReason) => void;
}

const ProUpsellContext = createContext<ProUpsellContextValue | null>(null);

export function useProUpsell() {
  const ctx = useContext(ProUpsellContext);
  if (!ctx) throw new Error("useProUpsell must be used within a ProUpsellProvider");
  return ctx.openUpsell;
}

export function ProUpsellProvider({ children }: { children: React.ReactNode }) {
  const [reason, setReason] = useState<UpsellReason | null>(null);
  const [loadingInterval, setLoadingInterval] = useState<"month" | "year" | null>(null);
  const showToast = useToast();

  const openUpsell = useCallback((r: UpsellReason = "general") => setReason(r), []);
  const close = useCallback(() => {
    if (!loadingInterval) setReason(null);
  }, [loadingInterval]);

  async function handleUpgrade(interval: "month" | "year") {
    setLoadingInterval(interval);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url) {
        showToast(data?.error ?? "Couldn't start checkout — try again.");
        return;
      }
      window.location.href = data.url;
    } catch {
      showToast("Couldn't reach the server — try again.");
    } finally {
      setLoadingInterval(null);
    }
  }

  const copy = reason ? UPSELL_COPY[reason] : null;

  return (
    <ProUpsellContext.Provider value={{ openUpsell }}>
      {children}
      {copy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-deep/30 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] bg-gradient-to-br from-white via-blush-soft to-lavender/30 p-6 text-center shadow-[0_30px_70px_-25px_rgba(192,120,140,0.6)]">
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-dusty-rose transition hover:text-rose-deep"
            >
              <X size={16} />
            </button>

            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-coral to-rose-deep text-white shadow-md">
              <Sparkles size={22} />
            </div>

            <h2 className="font-serif text-xl font-semibold text-rose-deep">{copy.title}</h2>
            <p className="mt-2 text-sm text-dusty-rose">{copy.subtext}</p>

            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleUpgrade("month")}
                disabled={loadingInterval !== null}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loadingInterval === "month" && <Loader2 size={15} className="animate-spin" />}
                Upgrade — $4.99/month
              </button>
              <button
                type="button"
                onClick={() => handleUpgrade("year")}
                disabled={loadingInterval !== null}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-rose-deep shadow-[0_2px_10px_-2px_rgba(192,120,140,0.4)] ring-1 ring-blush-dark/60 transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loadingInterval === "year" && <Loader2 size={15} className="animate-spin" />}
                $29.99/year (save 50%)
              </button>
            </div>

            <button
              type="button"
              onClick={close}
              disabled={loadingInterval !== null}
              className="mt-4 text-xs font-medium text-dusty-rose/80 underline-offset-2 hover:underline"
            >
              Stay on free for now
            </button>
          </div>
        </div>
      )}
    </ProUpsellContext.Provider>
  );
}
