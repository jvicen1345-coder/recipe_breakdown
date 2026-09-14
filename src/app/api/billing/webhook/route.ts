import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import { STRIPE_WEBHOOK_SECRET, stripe } from "@/lib/stripe";

function firstItem(subscription: Stripe.Subscription) {
  return subscription.items.data[0];
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const item = firstItem(subscription);
  const isActive = subscription.status === "active" || subscription.status === "trialing";

  await prisma.user.updateMany({
    where: { stripeCustomerId: customerId },
    data: {
      plan: isActive ? "pro" : "free",
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionInterval: item?.price.recurring?.interval ?? null,
      subscriptionRenewsAt: item ? new Date(item.current_period_end * 1000) : null,
      subscriptionCancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

export async function POST(request: Request) {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Stripe not configured." }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature ?? "", STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[api/billing/webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (typeof session.subscription === "string") {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          await syncSubscription(subscription);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created":
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            plan: "free",
            subscriptionStatus: "canceled",
            subscriptionCancelAtPeriodEnd: false,
            stripeSubscriptionId: null,
            subscriptionRenewsAt: null,
          },
        });
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("[api/billing/webhook] failed to process event:", event.type, err);
    return NextResponse.json({ error: "Failed to process event." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
