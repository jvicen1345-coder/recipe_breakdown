import { NextResponse } from "next/server";

import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured, stripe } from "@/lib/stripe";

export async function POST() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  if (user.plan !== "pro") {
    return NextResponse.json({ error: "You're not on a Pro plan." }, { status: 400 });
  }

  if (isStripeConfigured() && stripe && user.stripeSubscriptionId) {
    await stripe.subscriptions.update(user.stripeSubscriptionId, { cancel_at_period_end: true });
    await prisma.user.update({ where: { id: user.id }, data: { subscriptionCancelAtPeriodEnd: true } });
    return NextResponse.json({ canceledAtPeriodEnd: true, renewsAt: user.subscriptionRenewsAt });
  }

  // Test mode: no real subscription to schedule a cancellation on, so drop back to free now.
  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: "free",
      subscriptionStatus: null,
      subscriptionInterval: null,
      subscriptionRenewsAt: null,
      subscriptionCancelAtPeriodEnd: false,
    },
  });

  return NextResponse.json({ testMode: true, canceledImmediately: true });
}
