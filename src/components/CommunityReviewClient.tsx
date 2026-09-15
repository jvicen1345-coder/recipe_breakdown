"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useToast } from "./ToastProvider";
import type { CommunitySubmissionDto } from "@/lib/communitySubmissionTypes";

interface Props {
  isTrusted: boolean;
}

type Vote = "yes" | "not_sure" | "no";

export function CommunityReviewClient({ isTrusted }: Props) {
  const showToast = useToast();
  const [submissions, setSubmissions] = useState<CommunitySubmissionDto[] | null>(null);
  const [votingId, setVotingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isTrusted) return;
    fetch("/api/community/review-queue")
      .then((res) => res.json())
      .then((data) => setSubmissions(data.submissions ?? []))
      .catch(() => setSubmissions([]));
  }, [isTrusted]);

  async function castVote(id: string, vote: Vote) {
    setVotingId(id);
    try {
      const res = await fetch(`/api/community/submissions/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Couldn't submit your vote — try again.");
        return;
      }
      setSubmissions((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
      showToast("Thanks for reviewing! 🌸");
    } catch {
      showToast("Couldn't reach the server. Please try again.");
    } finally {
      setVotingId(null);
    }
  }

  if (!isTrusted) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-3 px-4 py-16 text-center">
        <span className="text-4xl">👩‍🍳</span>
        <h1 className="font-serif text-xl font-semibold text-rose-deep">Trusted Chefs only</h1>
        <p className="text-sm text-dusty-rose">
          Once a few of your own recipe submissions get approved, you&apos;ll earn the Trusted Chef badge and get to
          help review others&apos; submissions here 🌸
        </p>
        <Link href="/submit-recipe" className="mt-1 rounded-full bg-blush px-5 py-2 text-sm font-semibold text-rose-deep hover:bg-blush-dark">
          Share a recipe instead
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-semibold text-rose-deep">Review submissions 👩‍🍳</h1>
        <p className="text-sm text-dusty-rose">Does this feel like a real, original homemade recipe?</p>
      </div>

      {submissions === null && <p className="text-sm text-dusty-rose">Loading…</p>}

      {submissions?.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-blush-dark/50 bg-white/80 py-14 text-center">
          <span className="text-3xl">🌸</span>
          <p className="text-sm text-dusty-rose">No submissions waiting for review right now — check back soon!</p>
        </div>
      )}

      {submissions?.map((s) => (
        <div
          key={s.id}
          className="flex flex-col gap-3 rounded-[1.75rem] border border-blush-dark/50 bg-white/85 p-5 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)]"
        >
          {s.photoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element -- local upload, not an optimizable remote source */
            <img src={s.photoUrl} alt={s.title} className="h-44 w-full rounded-2xl object-cover" />
          )}
          <p className="font-serif text-lg font-semibold text-rose-deep">{s.title}</p>
          <p className="text-sm text-dusty-rose">{s.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {s.cuisineType && <span className="rounded-full bg-blush px-2.5 py-1 text-[10px] font-semibold text-rose-deep">{s.cuisineType}</span>}
            {s.dietTags.map((tag) => (
              <span key={tag} className="rounded-full bg-sage/25 px-2.5 py-1 text-[10px] font-semibold text-sage-dark">
                {tag}
              </span>
            ))}
          </div>
          <div className="rounded-2xl bg-blush-soft/60 p-3 text-sm italic text-dusty-rose">&ldquo;{s.story}&rdquo;</div>
          <details className="text-sm text-dusty-rose">
            <summary className="cursor-pointer font-medium text-rose-deep">Ingredients &amp; steps</summary>
            <ul className="mt-2 list-disc pl-5">
              {s.ingredients.map((ing, i) => (
                <li key={i}>
                  {ing.amount} {ing.unit} {ing.name}
                </li>
              ))}
            </ul>
            <ol className="mt-2 list-decimal pl-5">
              {s.instructions.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </details>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => castVote(s.id, "yes")}
              disabled={votingId === s.id}
              className="flex-1 rounded-full bg-gradient-to-r from-sage-dark to-sage px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Feels real 💚
            </button>
            <button
              type="button"
              onClick={() => castVote(s.id, "not_sure")}
              disabled={votingId === s.id}
              className="flex-1 rounded-full bg-blush px-4 py-2 text-sm font-semibold text-rose-deep transition hover:bg-blush-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              Not sure 🤔
            </button>
            <button
              type="button"
              onClick={() => castVote(s.id, "no")}
              disabled={votingId === s.id}
              className="flex-1 rounded-full bg-coral-deep/90 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Not convinced 👎
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
