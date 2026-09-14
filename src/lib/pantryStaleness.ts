export type StalenessLevel = "fresh" | "soft" | "banner" | "block";
export type GroceryCadence = "weekly" | "biweekly" | "whenever";

// Thresholds (in days since last pantry confirm) scale with how often the user says
// they shop, so a biweekly shopper isn't nagged on a weekly shopper's schedule. "block"
// is deliberately close across cadences — it's the "we genuinely can't trust this data
// for an order" ceiling, not a pace-matched nudge.
const THRESHOLDS_DAYS: Record<GroceryCadence, { soft: number; banner: number; block: number }> = {
  weekly: { soft: 7, banner: 14, block: 30 },
  biweekly: { soft: 14, banner: 21, block: 30 },
  whenever: { soft: 21, banner: 30, block: 45 },
};

export function daysSince(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

export function getStalenessLevel(
  lastConfirmedAt: Date | string | null | undefined,
  cadence: string | null | undefined,
): StalenessLevel {
  const days = daysSince(lastConfirmedAt);
  if (days === null) return "block"; // never confirmed at all — treat as maximally stale
  const t = THRESHOLDS_DAYS[(cadence as GroceryCadence) ?? "weekly"] ?? THRESHOLDS_DAYS.weekly;
  if (days >= t.block) return "block";
  if (days >= t.banner) return "banner";
  if (days >= t.soft) return "soft";
  return "fresh";
}
