"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight, LogOut, MailCheck, Shield, Sparkles } from "lucide-react";

import { useToast } from "./ToastProvider";

export function ProfileClient({
  email,
  name,
  showThisWeekCard: initialShowThisWeekCard,
  emailVerified,
  plan,
  points,
  pointsForFreePro,
  trustLevel,
  trustBadge,
  isAdmin,
}: {
  email: string;
  name: string | null;
  showThisWeekCard: boolean;
  emailVerified: boolean;
  plan: string;
  points: number;
  pointsForFreePro: number;
  trustLevel: "new" | "trusted" | "flagged";
  trustBadge: string | null;
  isAdmin: boolean;
}) {
  const isPro = plan === "pro";
  const router = useRouter();
  const showToast = useToast();
  const [showThisWeekCard, setShowThisWeekCard] = useState(initialShowThisWeekCard);
  const [savingToggle, setSavingToggle] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verify = params.get("verify");
    if (verify === "verified") {
      showToast("Email confirmed — you're all set! 🎉");
      router.replace("/profile");
      router.refresh();
    } else if (verify === "invalid") {
      showToast("That confirmation link is invalid or expired — try resending it below.");
      router.replace("/profile");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once, reading the URL on mount
  }, []);

  async function handleToggleThisWeekCard() {
    const next = !showThisWeekCard;
    setShowThisWeekCard(next);
    setSavingToggle(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showThisWeekCard: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setShowThisWeekCard(!next);
      showToast("Couldn't save that — try again.");
    } finally {
      setSavingToggle(false);
    }
  }

  async function handleResendVerification() {
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      if (!res.ok) throw new Error();
      setResent(true);
      showToast("Confirmation email sent 📬");
    } catch {
      showToast("Couldn't send that — try again in a bit.");
    } finally {
      setResending(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-8 sm:px-6">
      <Link href="/" className="inline-flex w-fit items-center gap-1 text-sm text-dusty-rose hover:text-rose-deep">
        <ArrowLeft size={14} /> Back to your recipes
      </Link>

      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-3xl font-semibold text-rose-deep">Your profile 🌸</h1>
          {isPro && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blush px-2.5 py-1 text-xs font-semibold text-rose-deep">
              <Sparkles size={11} /> Pro 🌸
            </span>
          )}
        </div>
        <p className="text-sm text-dusty-rose">{name ? `${name} · ${email}` : email}</p>
      </header>

      {!emailVerified && (
        <section className="flex flex-col gap-2 rounded-[1.75rem] border border-coral/40 bg-peach/30 p-5">
          <h2 className="flex items-center gap-1.5 font-serif text-lg font-semibold text-rose-deep">
            <MailCheck size={16} className="text-coral" /> You&apos;re a guest for now
          </h2>
          <p className="text-sm text-dusty-rose">
            Confirm <span className="font-semibold text-rose-deep">{email}</span> to add, edit, and cook recipes —
            you can still browse everything in the meantime.
          </p>
          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resending || resent}
            className="mt-1 inline-flex w-fit items-center gap-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resent ? "Confirmation email sent ✓" : resending ? "Sending…" : "Resend confirmation email"}
          </button>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-[1.75rem] border border-blush-dark/50 bg-white/85 p-5 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)] backdrop-blur-sm">
        <h2 className="font-serif text-lg font-semibold text-rose-deep">Homepage</h2>

        <label className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl bg-blush-soft px-4 py-3 text-left">
          <span className="text-xs font-medium text-rose-deep">
            Show &quot;This Week&quot; card
            <br />
            <span className="text-dusty-rose">Your streak, macros, and recommendation on the homepage</span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={showThisWeekCard}
            onClick={handleToggleThisWeekCard}
            disabled={savingToggle}
            className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-60 ${
              showThisWeekCard ? "bg-coral" : "bg-blush-dark"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                showThisWeekCard ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-[1.75rem] border border-blush-dark/50 bg-white/85 p-5 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)] backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-lg font-semibold text-rose-deep">Community 🌸</h2>
          {trustBadge && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sage/25 px-2.5 py-1 text-xs font-semibold text-sage-dark">
              {trustBadge}
            </span>
          )}
        </div>
        <p className="text-sm text-dusty-rose">
          ✨ {points} points — {Math.max(pointsForFreePro - points, 0)} to go for free Pro 🌸
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href="/submit-recipe"
            className="flex items-center justify-between gap-3 rounded-2xl bg-blush-soft px-4 py-3 text-left transition hover:bg-blush"
          >
            <span className="text-sm font-medium text-rose-deep">Share a recipe 🍓</span>
            <ChevronRight size={16} className="text-dusty-rose" />
          </Link>
          {trustLevel === "trusted" && (
            <Link
              href="/community/review"
              className="flex items-center justify-between gap-3 rounded-2xl bg-blush-soft px-4 py-3 text-left transition hover:bg-blush"
            >
              <span className="text-sm font-medium text-rose-deep">Review submissions 👩‍🍳</span>
              <ChevronRight size={16} className="text-dusty-rose" />
            </Link>
          )}
          {isAdmin && (
            <Link
              href="/admin/community"
              className="flex items-center justify-between gap-3 rounded-2xl bg-lavender/40 px-4 py-3 text-left transition hover:bg-lavender/60"
            >
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-rose-deep">
                <Shield size={14} /> Admin review queue
              </span>
              <ChevronRight size={16} className="text-dusty-rose" />
            </Link>
          )}
        </div>
      </section>

      <Link
        href="/profile/subscription"
        className="flex items-center justify-between gap-3 rounded-[1.75rem] border border-blush-dark/50 bg-white/85 p-5 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)] backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-md"
      >
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-coral" />
          <div>
            <p className="font-serif text-lg font-semibold text-rose-deep">Subscription</p>
            <p className="text-xs text-dusty-rose">{isPro ? "You're on Cutesy Eats Pro" : "You're on the free plan"}</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-dusty-rose" />
      </Link>

      <section className="flex flex-col gap-3 rounded-[1.75rem] border border-blush-dark/50 bg-white/85 p-5 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)] backdrop-blur-sm">
        <h2 className="font-serif text-lg font-semibold text-rose-deep">Account</h2>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-blush px-5 py-2.5 text-sm font-semibold text-rose-deep shadow-sm transition hover:bg-blush-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut size={15} /> Log out
        </button>
      </section>
    </div>
  );
}
