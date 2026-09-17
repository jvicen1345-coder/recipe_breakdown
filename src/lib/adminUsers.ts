// Shared between AdminUsersClient (the full /admin/users table) and UsersCard
// (the profile page's compact summary) so both read the same shape from
// /api/admin/users and render the same proSource badge.
import type { ProSource } from "./plan";

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  emailVerified: boolean;
  plan: string;
  proSource: ProSource;
  hasStripeSubscription: boolean;
  subscriptionStatus: string | null;
  subscriptionInterval: string | null;
  subscriptionRenewsAt: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
  proAccessUntil: string | null;
  points: number;
}

export const PRO_SOURCE_BADGE: Record<ProSource, { label: string; className: string }> = {
  owner: { label: "Owner 👑", className: "bg-lavender/40 text-rose-deep" },
  stripe: { label: "Pro · Stripe", className: "bg-sage/25 text-sage-dark" },
  community: { label: "Pro · points", className: "bg-blush text-rose-deep" },
  legacy: { label: "⚠️ Free grant", className: "bg-coral-deep/15 text-coral-deep" },
  free: { label: "Free", className: "bg-blush-soft text-dusty-rose" },
};

export function formatUserDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
