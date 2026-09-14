import Stripe from "stripe";

// Optional, like the other API keys in this app — without it, "upgrading" flips the
// account to Pro directly in a clearly-labeled test mode instead of charging anyone.
// Set STRIPE_SECRET_KEY (+ STRIPE_PRICE_MONTHLY/STRIPE_PRICE_YEARLY/STRIPE_WEBHOOK_SECRET)
// to take real payments.
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

export const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

export function isStripeConfigured(): boolean {
  return stripe !== null;
}

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export const STRIPE_PRICE_IDS: Record<"month" | "year", string | undefined> = {
  month: process.env.STRIPE_PRICE_MONTHLY,
  year: process.env.STRIPE_PRICE_YEARLY,
};
