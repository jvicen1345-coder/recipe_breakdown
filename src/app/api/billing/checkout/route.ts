import { NextResponse } from "next/server";
import { z } from "zod";

import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStripeConfigured, stripe, STRIPE_PRICE_IDS } from "@/lib/stripe";

const schema = z.object({ interval: z.enum(["month", "year"]) });

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

  if (!isStripeConfigured() || !stripe) {
    return NextResponse.json({ error: "Pro subscriptions aren't set up yet — check back soon!" }, { status: 501 });
  }

  const priceId = STRIPE_PRICE_IDS[interval];
  if (!priceId) {
    return NextResponse.json({ error: "Billing isn't fully configured yet." }, { status: 501 });
  }

  const origin = new URL(request.url).origin;

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
