import { NextResponse } from "next/server";

import { isAdminUser } from "@/lib/admin";
import { getSessionUserId } from "@/lib/auth";
import { getOwnerEmails } from "@/lib/plan";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// Manual admin override for the free-Pro cleanup case (legacy test-mode grants,
// or just "this account shouldn't have Pro") — the /admin/users equivalent of
// running scripts/downgrade-legacy-free-pro.mjs, but for one account at a time
// from the UI instead of a shell command.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminUserId = await getSessionUserId();
  if (!adminUserId || !(await isAdminUser(adminUserId))) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (getOwnerEmails().includes(user.email.toLowerCase())) {
    return NextResponse.json(
      { error: "This account gets Pro from OWNER_EMAILS — remove it there instead." },
      { status: 400 },
    );
  }

  if (user.stripeSubscriptionId && stripe) {
    try {
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);
    } catch (err) {
      // Already canceled on Stripe's side, or the ID is stale — either way, don't
      // block clearing the DB record over it.
      console.error("[api/admin/users/revoke-pro] failed to cancel Stripe subscription:", err);
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: "free",
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      subscriptionInterval: null,
      subscriptionRenewsAt: null,
      subscriptionCancelAtPeriodEnd: false,
      proAccessUntil: null,
    },
  });

  return NextResponse.json({ ok: true });
}
