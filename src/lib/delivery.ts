// Delivery search-link builders. No real partner API access is wired up here —
// like the other optional integrations in this app, an affiliate/associate id is
// appended to the link when configured, and everything still works (unattributed)
// without one.

export type DeliveryProvider = "instacart" | "amazon-fresh";

const INSTACART_AFFILIATE_ID = process.env.INSTACART_AFFILIATE_ID;
const AMAZON_ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG;

export const DELIVERY_PROVIDER_META: Record<
  DeliveryProvider,
  { label: string; emoji: string; badgeClassName: string }
> = {
  instacart: {
    label: "Instacart",
    emoji: "🥕",
    // Brand color lives ONLY on this badge — everything else in the flow stays in the app palette.
    badgeClassName: "bg-[#0AAD0A] text-white",
  },
  "amazon-fresh": {
    label: "Amazon Fresh",
    emoji: "📦",
    badgeClassName: "bg-[#FF9900] text-[#131921]",
  },
};

export function instacartSearchUrl(ingredient: string): string {
  const url = new URL("https://www.instacart.com/store/search");
  url.searchParams.set("k", ingredient);
  if (INSTACART_AFFILIATE_ID) url.searchParams.set("aff_id", INSTACART_AFFILIATE_ID);
  return url.toString();
}

export function amazonFreshSearchUrl(ingredient: string): string {
  const url = new URL("https://www.amazon.com/s");
  url.searchParams.set("k", ingredient);
  url.searchParams.set("i", "amazonfresh");
  if (AMAZON_ASSOCIATE_TAG) url.searchParams.set("tag", AMAZON_ASSOCIATE_TAG);
  return url.toString();
}

export function deliverySearchUrl(provider: DeliveryProvider, ingredient: string): string {
  return provider === "instacart" ? instacartSearchUrl(ingredient) : amazonFreshSearchUrl(ingredient);
}

export const DELIVERY_COMMISSION_DISCLOSURE =
  "Cutesy Eats may earn a small commission on orders placed through these links — it never changes what you pay. 💕";
