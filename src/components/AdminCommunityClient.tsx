"use client";

import { useEffect, useState } from "react";

import { useToast } from "./ToastProvider";
import type { CommunitySubmissionDto } from "@/lib/communitySubmissionTypes";

interface AdminSubmission extends CommunitySubmissionDto {
  submitterName: string;
  submitterEmail: string;
}

export function AdminCommunityClient() {
  const showToast = useToast();
  const [submissions, setSubmissions] = useState<AdminSubmission[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  function loadQueue() {
    fetch("/api/community/admin/queue")
      .then((res) => res.json())
      .then((data) => setSubmissions(data.submissions ?? []))
      .catch(() => setSubmissions([]));
  }

  useEffect(() => {
    loadQueue();
  }, []);

  async function approve(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/community/admin/submissions/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Couldn't approve — try again.");
        return;
      }
      setSubmissions((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
      showToast("Approved and published 🌸");
    } catch {
      showToast("Couldn't reach the server. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/community/admin/submissions/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Couldn't reject — try again.");
        return;
      }
      setSubmissions((prev) => (prev ? prev.filter((s) => s.id !== id) : prev));
      setRejectingId(null);
      setRejectReason("");
      showToast("Rejected.");
    } catch {
      showToast("Couldn't reach the server. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-semibold text-rose-deep">Admin review queue 🛡️</h1>
        <p className="text-sm text-dusty-rose">Submissions flagged by our AI screening or forwarded by community vote.</p>
      </div>

      {submissions === null && <p className="text-sm text-dusty-rose">Loading…</p>}

      {submissions?.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-blush-dark/50 bg-white/80 py-14 text-center">
          <span className="text-3xl">✨</span>
          <p className="text-sm text-dusty-rose">Queue is empty — nothing needs your review right now.</p>
        </div>
      )}

      {submissions?.map((s) => (
        <div
          key={s.id}
          className="flex flex-col gap-3 rounded-[1.75rem] border border-blush-dark/50 bg-white/85 p-5 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-serif text-lg font-semibold text-rose-deep">{s.title}</p>
              <p className="text-xs text-dusty-rose">
                {s.submitterName} · {s.submitterEmail}
              </p>
            </div>
            {s.aiFlags.length > 0 && (
              <span className="shrink-0 rounded-full bg-coral-deep/15 px-2.5 py-1 text-[10px] font-semibold text-coral-deep">
                {s.aiFlags.length} flag{s.aiFlags.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {s.photoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element -- local upload, not an optimizable remote source */
            <img src={s.photoUrl} alt={s.title} className="h-44 w-full rounded-2xl object-cover" />
          )}

          {s.aiFlags.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-2xl bg-coral-deep/10 p-3 text-xs text-coral-deep">
              {s.aiFlags.map((flag, i) => (
                <li key={i}>⚠️ {flag}</li>
              ))}
            </ul>
          )}

          <p className="text-sm text-dusty-rose">{s.description}</p>
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

          {rejectingId === s.id ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                placeholder="Reason for rejecting (shown to the submitter)"
                className="rounded-2xl border border-blush-dark/60 bg-white px-4 py-2 text-sm text-rose-deep outline-none focus:border-coral"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => reject(s.id)}
                  disabled={busyId === s.id || !rejectReason.trim()}
                  className="flex-1 rounded-full bg-coral-deep px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Confirm reject
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRejectingId(null);
                    setRejectReason("");
                  }}
                  className="flex-1 rounded-full bg-blush px-4 py-2 text-sm font-semibold text-rose-deep transition hover:bg-blush-dark"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                onClick={() => approve(s.id)}
                disabled={busyId === s.id}
                className="flex-1 rounded-full bg-gradient-to-r from-sage-dark to-sage px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Approve &amp; publish ✅
              </button>
              <button
                type="button"
                onClick={() => setRejectingId(s.id)}
                disabled={busyId === s.id}
                className="flex-1 rounded-full bg-blush px-4 py-2 text-sm font-semibold text-rose-deep transition hover:bg-blush-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
