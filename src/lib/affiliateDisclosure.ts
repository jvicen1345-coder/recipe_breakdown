// One-time "we may earn a commission" modal, shown before the very first retailer
// tap anywhere in the app — never shown again afterward. Plain localStorage flag,
// same pattern as the grocery list's checked/crossed-off storage.

const AFFILIATE_DISCLOSURE_SEEN_KEY = "cutesy-eats-affiliate-disclosure-seen";

export function hasSeenAffiliateDisclosure(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(AFFILIATE_DISCLOSURE_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markAffiliateDisclosureSeen() {
  try {
    window.localStorage.setItem(AFFILIATE_DISCLOSURE_SEEN_KEY, "1");
  } catch {
    // localStorage can throw in private-browsing contexts; the modal will just show again next time.
  }
}
