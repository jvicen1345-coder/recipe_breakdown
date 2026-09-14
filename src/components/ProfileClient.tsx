"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut } from "lucide-react";

import { useToast } from "./ToastProvider";

export function ProfileClient({
  email,
  name,
  showThisWeekCard: initialShowThisWeekCard,
}: {
  email: string;
  name: string | null;
  showThisWeekCard: boolean;
}) {
  const router = useRouter();
  const showToast = useToast();
  const [showThisWeekCard, setShowThisWeekCard] = useState(initialShowThisWeekCard);
  const [savingToggle, setSavingToggle] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
        <h1 className="font-serif text-3xl font-semibold text-rose-deep">Your profile 🌸</h1>
        <p className="text-sm text-dusty-rose">{name ? `${name} · ${email}` : email}</p>
      </header>

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
