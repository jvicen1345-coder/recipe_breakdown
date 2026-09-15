// Delivery/affiliate deep-link builders. No real partner API access is wired up
// here — like the other optional integrations in this app, an affiliate id/tag is
// appended to a link when configured, and every link still works (unattributed)
// without one. See utils/cartBuilding-style upgrade path in the Instacart/Kroger
// *_DEVELOPER_APPROVED env vars: once those partner integrations are approved, only
// the builders below need to change — every call site stays the same.

export type DeliveryProvider = "instacart" | "amazon-fresh" | "walmart" | "kroger";

/** Where an affiliate click originated — powers the click-analytics `source` field. */
export type AffiliateClickSource = "recipe_page" | "grocery_list" | "smart_cart" | "girl_dinner" | "cook_mode_exit";

const INSTACART_AFFILIATE_ID = process.env.INSTACART_AFFILIATE_ID;
const AMAZON_ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG;
const WALMART_AFFILIATE_ID = process.env.WALMART_AFFILIATE_ID;
const DOORDASH_AFFILIATE_ID = process.env.DOORDASH_AFFILIATE_ID;

export const DELIVERY_PROVIDER_META: Record<
  DeliveryProvider,
  { label: string; emoji: string; badgeClassName: string; gradientClassName: string; comingSoon?: boolean }
> = {
  instacart: {
    label: "Instacart",
    emoji: "🥕",
    // Brand color lives ONLY on these — everything else in the flow stays in the app palette.
    badgeClassName: "bg-[#43B02A] text-white",
    gradientClassName: "bg-gradient-to-r from-[#43B02A] to-[#2f8a1f]",
  },
  "amazon-fresh": {
    label: "Amazon Fresh",
    emoji: "📦",
    badgeClassName: "bg-[#FF9900] text-[#131921]",
    gradientClassName: "bg-gradient-to-r from-[#FF9900] to-[#FFB347]",
  },
  walmart: {
    label: "Walmart",
    emoji: "🔵",
    badgeClassName: "bg-[#0071CE] text-white",
    gradientClassName: "bg-gradient-to-r from-[#0071CE] to-[#3f97e0]",
  },
  kroger: {
    label: "Kroger",
    emoji: "🟠",
    badgeClassName: "bg-[#003CA6] text-white",
    gradientClassName: "bg-gradient-to-r from-[#003CA6] to-[#1d5fc7]",
    comingSoon: true,
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

export function walmartSearchUrl(ingredient: string): string {
  const url = new URL("https://www.walmart.com/search");
  url.searchParams.set("q", ingredient);
  url.searchParams.set("departmentId", "976759");
  if (WALMART_AFFILIATE_ID) {
    url.searchParams.set("affilsrc", "api");
    url.searchParams.set("wmlspartner", WALMART_AFFILIATE_ID);
  }
  return url.toString();
}

// Kroger requires a Developer Platform partnership (behind an LLC) to go beyond a
// plain search link — see KROGER_DEVELOPER_APPROVED. Until then this is a stub.
export function krogerSearchUrl(ingredient: string): string {
  const url = new URL("https://www.kroger.com/search");
  url.searchParams.set("query", ingredient);
  url.searchParams.set("searchType", "default_search");
  return url.toString();
}

export function deliverySearchUrl(provider: DeliveryProvider, ingredient: string): string {
  switch (provider) {
    case "instacart":
      return instacartSearchUrl(ingredient);
    case "amazon-fresh":
      return amazonFreshSearchUrl(ingredient);
    case "walmart":
      return walmartSearchUrl(ingredient);
    case "kroger":
      return krogerSearchUrl(ingredient);
  }
}

/** DoorDash appears only in Girl Dinner and the Cook Mode exit flow — never the retailer selector. */
export function doordashLink(): string {
  const url = new URL("https://www.doordash.com/grocery/");
  if (DOORDASH_AFFILIATE_ID) url.searchParams.set("affiliate_id", DOORDASH_AFFILIATE_ID);
  return url.toString();
}

const NATIVE_APP_SCHEMES: Partial<Record<DeliveryProvider, (ingredient: string) => string>> = {
  instacart: (ingredient) => `instacart://search?term=${encodeURIComponent(ingredient)}`,
  "amazon-fresh": (ingredient) =>
    `com.amazon.mobile.shopping.web://search?k=${encodeURIComponent(ingredient)}&i=amazonfresh`,
  walmart: (ingredient) => `walmart://search?query=${encodeURIComponent(ingredient)}`,
};

/** Attempts the retailer's native app first, falling back to the web search link. */
export function openRetailerWithFallback(provider: DeliveryProvider, ingredient: string) {
  if (typeof window === "undefined") return;
  const webUrl = deliverySearchUrl(provider, ingredient);
  const nativeUrl = NATIVE_APP_SCHEMES[provider]?.(ingredient);
  if (nativeUrl) {
    window.location.href = nativeUrl;
    setTimeout(() => {
      window.location.href = webUrl;
    }, 500);
  } else {
    window.location.href = webUrl;
  }
}

/** Same native-app-then-web pattern as openRetailerWithFallback, for DoorDash's own link shape. */
export function openDoorDashWithFallback() {
  if (typeof window === "undefined") return;
  window.location.href = "doordash://";
  setTimeout(() => {
    window.location.href = doordashLink();
  }, 500);
}

// Smart ingredient cleaner — strips cooking instructions so the search query is just
// the ingredient name ("2 cups flour, sifted" -> "flour").
export function cleanIngredient(ingredient: string): string {
  return ingredient
    .replace(/,.*/, "")
    .replace(/\(.*\)/, "")
    .replace(
      /\b(minced|chopped|diced|sliced|room temperature|cooked|raw|fresh|frozen|dried|ground|grated|shredded)\b/gi,
      "",
    )
    .trim();
}

const AFFILIATE_EVENTS_KEY = "cutesy-eats-affiliate-events";
const MAX_STORED_EVENTS = 200;

interface AffiliateClickEvent {
  retailer: DeliveryProvider | "doordash";
  source: AffiliateClickSource;
  ingredientCount: number;
  timestamp: string;
}

/**
 * Feature 5: records every affiliate click for your own visibility — which retailer
 * users prefer, which source context converts best. Kept locally (bounded, so it
 * never grows unbounded) and mirrored server-side via /api/cart/order so it survives
 * across devices and doesn't rely on the visitor's browser storage.
 */
export function trackAffiliateClick(event: {
  retailer: DeliveryProvider | "doordash";
  source: AffiliateClickSource;
  ingredientCount: number;
  items?: string[];
  recipeId?: string | null;
}) {
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(AFFILIATE_EVENTS_KEY);
      const existing: AffiliateClickEvent[] = raw ? JSON.parse(raw) : [];
      const next = [
        ...(Array.isArray(existing) ? existing : []),
        {
          retailer: event.retailer,
          source: event.source,
          ingredientCount: event.ingredientCount,
          timestamp: new Date().toISOString(),
        },
      ].slice(-MAX_STORED_EVENTS);
      window.localStorage.setItem(AFFILIATE_EVENTS_KEY, JSON.stringify(next));
    } catch {
      // localStorage can throw in private-browsing contexts — the server-side log below still lands.
    }
  }

  fetch("/api/cart/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: event.retailer,
      items: event.items ?? [],
      recipeId: event.recipeId ?? null,
      source: event.source,
    }),
  }).catch(() => {
    // Best-effort analytics logging — never blocks the actual shopping hand-off.
  });
}

export const DELIVERY_COMMISSION_DISCLOSURE =
  "Cutesy Eats may earn a small commission on purchases — this never affects your price 🌸";
