"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";

import { usePlan } from "./PlanProvider";
import { useToast } from "./ToastProvider";

const PRO_PERKS = [
  "100 recipe imports a month",
  "Cook Mode 🍳",
  "Full pantry checker 🧺",
  "Smart missing ingredients list",
  "Delivery cart integration 🛒",
  "Unlimited folders",
  "Weekly nutrition snapshot",
  "Recipe swiper",
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

export function SubscriptionClient({
  plan,
  subscriptionInterval,
  subscriptionRenewsAt,
  subscriptionCancelAtPeriodEnd,
  ingredientsSavedByPantry,
}: {
  plan: string;
  subscriptionInterval: string | null;
  subscriptionRenewsAt: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
  ingredientsSavedByPantry: number;
}) {
  const router = useRouter();
  const showToast = useToast();
  const { refresh: refreshPlan } = usePlan();
  const isPro = plan === "pro";
  const [loadingInterval, setLoadingInterval] = useState<"month" | "year" | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);

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
    } finally {
      setLoadingInterval(null);
    }
  }

  async function handleCancel() {
    setCanceling(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(data?.error ?? "Couldn't cancel — try again.");
        return;
      }
      setConfirmingCancel(false);
      showToast(
        data.canceledAtPeriodEnd
          ? "Your plan won't renew — you'll keep Pro until the period ends 🌸"
          : "Your plan has been canceled.",
      );
      router.refresh();
      refreshPlan();
    } finally {
      setCanceling(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link
        href="/profile"
        className="inline-flex w-fit items-center gap-1 text-sm text-dusty-rose hover:text-rose-deep"
      >
        <ArrowLeft size={14} /> Back to profile
      </Link>

      <header className="flex flex-col gap-1">
        <h1 className="font-serif text-3xl font-semibold text-rose-deep">Subscription</h1>
        <p className="text-sm text-dusty-rose">Manage your Cutesy Eats plan.</p>
      </header>

      <section className="flex flex-col gap-2 rounded-[1.75rem] bg-gradient-to-br from-white via-blush-soft to-lavender/30 p-5 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)]">
        <p className="text-xs text-dusty-rose">🧺 Your pantry is paying for itself</p>
        <p className="font-serif text-lg font-semibold text-rose-deep">
          It&apos;s saved you from buying {ingredientsSavedByPantry} ingredient
          {ingredientsSavedByPantry === 1 ? "" : "s"} you already owned
        </p>
      </section>

      {isPro ? (
        <section className="flex flex-col gap-4 rounded-[1.75rem] border border-blush-dark/50 bg-white/85 p-5 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)] backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-blush px-3 py-1 text-sm font-semibold text-rose-deep">
              <Sparkles size={13} /> Cutesy Eats Pro
            </span>
            <span className="text-xs text-dusty-rose">
              {subscriptionInterval === "year" ? "Billed yearly" : "Billed monthly"}
            </span>
          </div>

          {subscriptionCancelAtPeriodEnd ? (
            <p className="text-sm text-dusty-rose">
              Your plan won&apos;t renew — you&apos;ll keep Pro until{" "}
              <span className="font-semibold text-rose-deep">{formatDate(subscriptionRenewsAt)}</span>.
            </p>
          ) : (
            <p className="text-sm text-dusty-rose">
              Next billing date: <span className="font-semibold text-rose-deep">{formatDate(subscriptionRenewsAt)}</span>
            </p>
          )}

          {!subscriptionCancelAtPeriodEnd &&
            (confirmingCancel ? (
              <div className="flex flex-col gap-3 rounded-2xl bg-blush-soft p-4">
                <p className="text-sm font-medium text-rose-deep">
                  Are you sure? You&apos;ll lose access to:
                </p>
                <ul className="flex flex-col gap-1 text-sm text-dusty-rose">
                  {PRO_PERKS.map((perk) => (
                    <li key={perk}>• {perk}</li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={canceling}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-rose-deep shadow-sm ring-1 ring-blush-dark/60 transition hover:bg-blush disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {canceling && <Loader2 size={14} className="animate-spin" />}
                    Yes, cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingCancel(false)}
                    className="rounded-full bg-gradient-to-r from-coral to-rose-deep px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
                  >
                    Keep my Pro 🌸
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmingCancel(true)}
                className="self-start text-xs font-medium text-dusty-rose underline-offset-2 hover:underline"
              >
                Cancel subscription
              </button>
            ))}
        </section>
      ) : (
        <section className="flex flex-col gap-4 rounded-[1.75rem] border border-blush-dark/50 bg-white/85 p-5 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)] backdrop-blur-sm">
          <div>
            <p className="font-serif text-lg font-semibold text-rose-deep">You&apos;re on the free plan</p>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-dusty-rose">
              {PRO_PERKS.map((perk) => (
                <li key={perk}>• {perk}</li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2.5">
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
        </section>
      )}
    </div>
  );
}
