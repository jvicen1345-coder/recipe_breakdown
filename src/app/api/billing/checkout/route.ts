import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRequestOrigin } from "@/lib/requestOrigin";
import { isStripeConfigured, stripe, STRIPE_PRICE_IDS } from "@/lib/stripe";

const schema = z.object({ interval: z.enum(["month", "year"]) });

const TEST_MODE_DURATION_MS: Record<"month" | "year", number> = {
  month: 1000 * 60 * 60 * 24 * 30,
  year: 1000 * 60 * 60 * 24 * 365,
};

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pick a monthly or yearly plan." }, { status: 400 });
  }
  const { interval } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const origin = getRequestOrigin(request);

  if (isStripeConfigured() && stripe) {
    const priceId = STRIPE_PRICE_IDS[interval];
    if (!priceId) {
      return NextResponse.json({ error: "Billing isn't fully configured yet." }, { status: 501 });
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
      customerId = customer.id;
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/profile/subscription?checkout=success`,
      cancel_url: `${origin}/profile/subscription?checkout=canceled`,
    });

    return NextResponse.json({ url: session.url });
  }

  // Test mode: no Stripe configured, so there's no real charge — flip the plan directly
  // and say so plainly, rather than pretending a payment happened.
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: "pro",
      subscriptionStatus: "active",
      subscriptionInterval: interval,
      subscriptionRenewsAt: new Date(Date.now() + TEST_MODE_DURATION_MS[interval]),
      subscriptionCancelAtPeriodEnd: false,
    },
  });

  return NextResponse.json({
    testMode: true,
    pantryOnboardingNeeded: !updated.pantryOnboardedAt,
  });
}
