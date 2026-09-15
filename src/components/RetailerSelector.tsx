"use client";

import { useState } from "react";

import { useToast } from "./ToastProvider";
import { hasSeenAffiliateDisclosure, markAffiliateDisclosureSeen } from "@/lib/affiliateDisclosure";
import { DELIVERY_COMMISSION_DISCLOSURE, DELIVERY_PROVIDER_META, type DeliveryProvider } from "@/lib/delivery";

const GROCERY_PROVIDERS: DeliveryProvider[] = ["instacart", "amazon-fresh", "walmart", "kroger"];

// The core UI element for every shopping integration in the app (grocery list banner,
// "Shop this recipe") — DoorDash is deliberately never part of this component; it only
// ever appears via its own dedicated buttons in Girl Dinner and the Cook Mode exit flow.
export function RetailerSelector({ onSelect }: { onSelect: (provider: DeliveryProvider) => void }) {
  const showToast = useToast();
  const [pendingProvider, setPendingProvider] = useState<DeliveryProvider | null>(null);

  function handleTap(provider: DeliveryProvider) {
    if (DELIVERY_PROVIDER_META[provider].comingSoon) {
      showToast("Kroger integration coming soon 🌸 — try Instacart or Walmart for now");
      return;
    }
    if (hasSeenAffiliateDisclosure()) {
      onSelect(provider);
    } else {
      setPendingProvider(provider);
    }
  }

  function handleDisclosureConfirm() {
    markAffiliateDisclosureSeen();
    const provider = pendingProvider;
    setPendingProvider(null);
    if (provider) onSelect(provider);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-3 max-[359px]:grid-cols-1">
        {GROCERY_PROVIDERS.map((provider) => {
          const meta = DELIVERY_PROVIDER_META[provider];
          return (
            <button
              key={provider}
              type="button"
              onClick={() => handleTap(provider)}
              className={`inline-flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-105 ${meta.gradientClassName} ${meta.comingSoon ? "opacity-70" : ""}`}
            >
              {meta.comingSoon && (
                <span className="rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-semibold text-rose-deep">
                  Coming soon 🌸
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <span className="text-base">{meta.emoji}</span>
                Shop on {meta.label}
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-center text-[11px] text-dusty-rose/70">{DELIVERY_COMMISSION_DISCLOSURE}</p>

      {pendingProvider && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-rose-deep/30 p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-[2rem] bg-white p-6 text-center shadow-[0_30px_70px_-25px_rgba(192,120,140,0.6)]">
            <span className="text-3xl">🌸</span>
            <h2 className="font-serif text-lg font-semibold text-rose-deep">Just so you know 🌸</h2>
            <p className="text-sm text-dusty-rose">
              When you shop through Cutesy Eats links we may earn a small commission — it never changes your price
              and helps keep the app free for everyone ✨
            </p>
            <button
              type="button"
              onClick={handleDisclosureConfirm}
              className="mt-1 w-full rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-105"
            >
              Got it, let&apos;s shop! 🛒
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
