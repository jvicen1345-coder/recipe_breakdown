"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, TriangleAlert } from "lucide-react";

import { type AdminUser, PRO_SOURCE_BADGE, formatUserDate } from "@/lib/adminUsers";
import { useToast } from "./ToastProvider";

export function AdminUsersClient() {
  const showToast = useToast();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [grantingId, setGrantingId] = useState<string | null>(null);
  const [grantDays, setGrantDays] = useState("30");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadUsers = useCallback(() => {
    return fetch("/api/admin/users")
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Failed to load users.");
        setUsers(data.users ?? []);
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load users."));
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function revokePro(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/revoke-pro`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(data?.error ?? "Couldn't revoke Pro — try again.");
        return;
      }
      setConfirmingId(null);
      showToast("Pro access revoked.");
      await loadUsers();
    } catch {
      showToast("Couldn't reach the server — try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function grantPro(id: string) {
    const days = Number(grantDays);
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}/grant-pro`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: Number.isFinite(days) && days > 0 ? days : undefined }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(data?.error ?? "Couldn't grant Pro — try again.");
        return;
      }
      setGrantingId(null);
      showToast("Pro access granted 🌸");
      await loadUsers();
    } catch {
      showToast("Couldn't reach the server — try again.");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    if (!users) return null;
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.email.toLowerCase().includes(q) || (u.name ?? "").toLowerCase().includes(q),
    );
  }, [users, query]);

  const legacyCount = users?.filter((u) => u.proSource === "legacy").length ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link href="/profile" className="inline-flex w-fit items-center gap-1 text-sm text-dusty-rose hover:text-rose-deep">
        <ArrowLeft size={14} /> Back to profile
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-2xl font-semibold text-rose-deep">Users 🛡️</h1>
        <p className="text-sm text-dusty-rose">
          {users ? `${users.length} account${users.length === 1 ? "" : "s"}` : "Loading…"}
        </p>
      </div>

      {legacyCount > 0 && (
        <div className="flex items-start gap-2 rounded-2xl border border-coral-deep/30 bg-coral-deep/10 p-4 text-sm text-coral-deep">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          <span>
            {legacyCount} account{legacyCount === 1 ? "" : "s"} marked <strong>⚠️ Free grant</strong> — Pro was
            switched on with no real Stripe subscription behind it (a leftover from the old test-mode checkout).
            Run <code className="rounded bg-white/60 px-1 py-0.5">npm run downgrade-legacy-pro</code> to clean these up.
          </span>
        </div>
      )}

      {error && <p className="text-sm text-coral-deep">{error}</p>}

      {users && users.length > 0 && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full rounded-full border border-blush-dark/60 bg-white px-4 py-2 text-sm text-rose-deep outline-none focus:border-coral"
        />
      )}

      {users === null && !error && <p className="text-sm text-dusty-rose">Loading…</p>}

      {filtered?.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-blush-dark/50 bg-white/80 py-14 text-center">
          <span className="text-3xl">🔍</span>
          <p className="text-sm text-dusty-rose">No accounts match that search.</p>
        </div>
      )}

      {filtered && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-[1.75rem] border border-blush-dark/50 bg-white/85 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)]">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-blush-dark/40 text-xs uppercase tracking-wide text-dusty-rose">
                <th className="px-4 py-3 font-medium">Account</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Renews / expires</th>
                <th className="px-4 py-3 font-medium">Points</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const badge = PRO_SOURCE_BADGE[u.proSource];
                const renewsOrExpires =
                  u.proSource === "stripe"
                    ? `${u.subscriptionCancelAtPeriodEnd ? "Ends" : "Renews"} ${formatUserDate(u.subscriptionRenewsAt)}`
                    : u.proSource === "community"
                      ? `Until ${formatUserDate(u.proAccessUntil)}`
                      : "—";
                return (
                  <tr key={u.id} className="border-b border-blush-dark/20 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium text-rose-deep">{u.name || u.email}</p>
                      <p className="text-xs text-dusty-rose">
                        {u.name ? u.email : null}
                        {!u.emailVerified && (
                          <span className="ml-1.5 rounded-full bg-blush-soft px-1.5 py-0.5 text-[10px] font-semibold text-dusty-rose">
                            unverified
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-dusty-rose">{formatUserDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-dusty-rose">{renewsOrExpires}</td>
                    <td className="px-4 py-3 text-dusty-rose">{u.points}</td>
                    <td className="px-4 py-3 text-right">
                      {u.proSource === "free" &&
                        (grantingId === u.id ? (
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <input
                              type="number"
                              min={1}
                              max={365}
                              value={grantDays}
                              onChange={(e) => setGrantDays(e.target.value)}
                              className="w-14 rounded-full border border-blush-dark/60 bg-white px-2 py-1 text-xs text-rose-deep outline-none focus:border-coral"
                            />
                            <span className="text-xs text-dusty-rose">days</span>
                            <button
                              type="button"
                              onClick={() => grantPro(u.id)}
                              disabled={busyId === u.id}
                              className="inline-flex items-center gap-1 rounded-full bg-sage px-3 py-1.5 text-xs font-semibold text-sage-dark transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyId === u.id && <Loader2 size={12} className="animate-spin" />}
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setGrantingId(null)}
                              disabled={busyId === u.id}
                              className="rounded-full bg-blush px-3 py-1.5 text-xs font-semibold text-rose-deep transition hover:bg-blush-dark disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setGrantDays("30");
                              setGrantingId(u.id);
                            }}
                            className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-sage-dark underline-offset-2 hover:underline"
                          >
                            Grant Pro
                          </button>
                        ))}
                      {u.proSource !== "free" && u.proSource !== "owner" && (
                        confirmingId === u.id ? (
                          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <span className="text-xs text-dusty-rose">Revoke?</span>
                            <button
                              type="button"
                              onClick={() => revokePro(u.id)}
                              disabled={busyId === u.id}
                              className="inline-flex items-center gap-1 rounded-full bg-coral-deep px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {busyId === u.id && <Loader2 size={12} className="animate-spin" />}
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingId(null)}
                              disabled={busyId === u.id}
                              className="rounded-full bg-blush px-3 py-1.5 text-xs font-semibold text-rose-deep transition hover:bg-blush-dark disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmingId(u.id)}
                            className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold text-coral-deep underline-offset-2 hover:underline"
                          >
                            Revoke Pro
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
