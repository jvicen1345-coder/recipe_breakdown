"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";

import { type AdminUser, PRO_SOURCE_BADGE, formatUserDate } from "@/lib/adminUsers";

const PREVIEW_COUNT = 5;

// Admin-only summary of registered accounts, shown right on the profile page —
// the full sortable/searchable table lives at /admin/users (AdminUsersClient);
// this just answers "who's signed up lately" without leaving /profile.
export function UsersCard() {
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) throw new Error(data?.error ?? "Failed to load users.");
        setUsers(data.users ?? []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load users."));
  }, []);

  const proCount = users?.filter((u) => u.proSource !== "free").length ?? 0;

  return (
    <section className="flex flex-col gap-3 rounded-[1.75rem] border border-blush-dark/50 bg-white/85 p-5 shadow-[0_20px_55px_-25px_rgba(192,120,140,0.5)] backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <Users size={17} className="text-coral" />
        <h2 className="font-serif text-lg font-semibold text-rose-deep">Users 🛡️</h2>
      </div>

      {error && <p className="text-sm text-coral-deep">{error}</p>}
      {users === null && !error && <p className="text-sm text-dusty-rose">Loading…</p>}

      {users && (
        <>
          <p className="text-sm text-dusty-rose">
            {users.length} registered account{users.length === 1 ? "" : "s"} — {proCount} on Pro
          </p>

          {users.length > 0 && (
            <ul className="flex flex-col gap-2">
              {users.slice(0, PREVIEW_COUNT).map((u) => {
                const badge = PRO_SOURCE_BADGE[u.proSource];
                return (
                  <li
                    key={u.id}
                    className="flex items-center justify-between gap-2 rounded-2xl bg-blush-soft px-4 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-rose-deep">{u.name || u.email}</p>
                      <p className="text-xs text-dusty-rose">Joined {formatUserDate(u.createdAt)}</p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <Link
        href="/admin/users"
        className="flex items-center justify-between gap-3 rounded-2xl bg-lavender/40 px-4 py-3 text-left transition hover:bg-lavender/60"
      >
        <span className="text-sm font-medium text-rose-deep">View all users</span>
        <ChevronRight size={16} className="text-dusty-rose" />
      </Link>
    </section>
  );
}
