// Metric/sync freshness (spec section 21). Configurable thresholds
// (default 0-24h fresh, 24-72h needs update, 72h+ stale, matching the
// brief's own example) rather than a single hardcoded cutoff.

export type FreshnessStatus = "fresh" | "needs_update" | "stale" | "never_synced";

export interface FreshnessThresholds {
  freshHours: number;
  staleHours: number;
}

export const DEFAULT_FRESHNESS_THRESHOLDS: FreshnessThresholds = { freshHours: 24, staleHours: 72 };

export function computeFreshness(
  lastSyncedAt: string | null,
  thresholds: FreshnessThresholds = DEFAULT_FRESHNESS_THRESHOLDS,
  now: Date = new Date()
): FreshnessStatus {
  if (!lastSyncedAt) return "never_synced";
  const hoursSince = (now.getTime() - new Date(lastSyncedAt).getTime()) / (60 * 60 * 1000);
  if (hoursSince <= thresholds.freshHours) return "fresh";
  if (hoursSince <= thresholds.staleHours) return "needs_update";
  return "stale";
}

export function formatFreshnessLabel(lastSyncedAt: string | null, now: Date = new Date()): string {
  if (!lastSyncedAt) return "Never synced";
  const hoursSince = (now.getTime() - new Date(lastSyncedAt).getTime()) / (60 * 60 * 1000);
  if (hoursSince < 1) return "Last updated: just now";
  if (hoursSince < 24) {
    const hours = Math.round(hoursSince);
    return `Last updated: ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.round(hoursSince / 24);
  return `Last updated: ${days} day${days === 1 ? "" : "s"} ago`;
}
