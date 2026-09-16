export const FREE_RECIPE_LIMIT = 10;
export const FREE_FOLDER_LIMIT = 2;

export const PRO_PRICE_MONTHLY_USD = 4.99;
export const PRO_PRICE_YEARLY_USD = 29.99;

// The app owner gets Pro for free — same allowlist-by-env-var pattern as
// ADMIN_EMAILS in lib/admin.ts. Everyone else needs a real subscription or
// community points redeemed via proAccessUntil (see lib/community.ts).
function getOwnerEmails(): string[] {
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
