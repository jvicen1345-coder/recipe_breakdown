import { prisma } from "./prisma";

export const FREE_RECIPE_LIMIT = 25;
export const FREE_FOLDER_LIMIT = 2;

// Pro isn't unlimited — it's a much roomier monthly allowance instead of the
// free plan's lifetime cap, so it resets every 30 days rather than ever running out.
export const PRO_MONTHLY_RECIPE_LIMIT = 100;

export const PRO_PRICE_MONTHLY_USD = 4.99;
export const PRO_PRICE_YEARLY_USD = 29.99;

export async function countRecipesThisMonth(userId: string): Promise<number> {
  const monthAgo = new Date(Date.now() - 30 * 86_400_000);
  return prisma.recipe.count({ where: { userId, createdAt: { gte: monthAgo } } });
}

// The app owner gets Pro for free — same allowlist-by-env-var pattern as
// ADMIN_EMAILS in lib/admin.ts. Everyone else needs a real subscription or
// community points redeemed via proAccessUntil (see lib/community.ts).
export function getOwnerEmails(): string[] {
  return (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPro(user: { plan: string; proAccessUntil: Date | null; email: string }): boolean {
  if (getOwnerEmails().includes(user.email.toLowerCase())) return true;
  if (user.plan === "pro") return true;
  return user.proAccessUntil != null && user.proAccessUntil.getTime() > Date.now();
}

export type ProSource = "owner" | "stripe" | "community" | "legacy" | "free";

// Classifies *why* a user is (or isn't) Pro — powers the admin users page.
// "legacy" flags plan === "pro" rows with no real Stripe subscription behind
// them: the old test-mode checkout bug (removed) set exactly that shape, so
// any row still in that state got a free upgrade that was never paid for.
export function getProSource(user: {
  plan: string;
  proAccessUntil: Date | null;
  email: string;
  stripeSubscriptionId: string | null;
}): ProSource {
  if (getOwnerEmails().includes(user.email.toLowerCase())) return "owner";
  if (user.plan === "pro" && user.stripeSubscriptionId) return "stripe";
  if (user.proAccessUntil != null && user.proAccessUntil.getTime() > Date.now()) return "community";
  if (user.plan === "pro") return "legacy";
  return "free";
}
