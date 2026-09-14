"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <div className="flex flex-col items-center gap-1 text-center">
        <h1 className="font-serif text-3xl font-semibold text-rose-deep">Welcome back 🌸</h1>
        <p className="text-sm text-dusty-rose">Log in to your Cutesy Eats box.</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex w-full flex-col gap-3 rounded-[2rem] border border-blush-dark/50 bg-white/85 p-6 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)] backdrop-blur-sm"
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-rose-deep">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/30 disabled:opacity-60"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-rose-deep">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            className="rounded-full border border-blush-dark/60 bg-white px-4 py-2.5 text-sm outline-none focus:border-coral focus:ring-2 focus:ring-coral/30 disabled:opacity-60"
          />
        </label>

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-coral-deep">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-coral to-rose-deep px-6 py-2.5 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          Log in
        </button>
      </form>

      <p className="text-sm text-dusty-rose">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-rose-deep underline-offset-2 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
