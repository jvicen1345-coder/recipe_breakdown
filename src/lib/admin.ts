// Gates the community-submission admin dashboard. There's no roles table in this
// app — like RESEND_API_KEY or STRIPE_SECRET_KEY, admin access is just an env var,
// a comma-separated allowlist of emails, checked against the signed-in account.
import { prisma } from "./prisma";

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const admins = getAdminEmails();
  if (admins.length === 0) return false;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return user != null && admins.includes(user.email.toLowerCase());
}
