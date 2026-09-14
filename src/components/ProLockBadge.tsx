"use client";

import { Lock } from "lucide-react";

import { useProUpsell } from "./ProUpsellProvider";
import type { UpsellReason } from "./ProUpsellProvider";

// A soft, aspirational "Pro" pill — never a red/alarming lock. Tapping it opens the
// upsell modal with copy tailored to whatever feature it's guarding.
export function ProLockBadge({ reason, className = "" }: { reason: UpsellReason; className?: string }) {
  const openUpsell = useProUpsell();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openUpsell(reason);
      }}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-blush px-2.5 py-1 text-[11px] font-semibold text-rose-deep shadow-sm transition hover:-translate-y-0.5 hover:bg-blush-dark hover:shadow-md ${className}`}
    >
      <Lock size={11} /> Pro
    </button>
  );
}
