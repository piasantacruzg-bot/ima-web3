import { describe, it, expect } from "vitest";
import { computeFreshness, formatFreshnessLabel, DEFAULT_FRESHNESS_THRESHOLDS } from "@/lib/freshness";

const NOW = new Date("2026-06-15T12:00:00Z");

describe("computeFreshness", () => {
  it("is never_synced when there's no last_synced_at at all", () => {
    expect(computeFreshness(null, DEFAULT_FRESHNESS_THRESHOLDS, NOW)).toBe("never_synced");
  });

  it("is fresh within the fresh threshold (default 24h)", () => {
    expect(computeFreshness("2026-06-15T00:00:00Z", DEFAULT_FRESHNESS_THRESHOLDS, NOW)).toBe("fresh");
  });

  it("is needs_update between the fresh and stale thresholds", () => {
    expect(computeFreshness("2026-06-13T12:00:00Z", DEFAULT_FRESHNESS_THRESHOLDS, NOW)).toBe("needs_update"); // 48h ago
  });

  it("is stale beyond the stale threshold (default 72h)", () => {
    expect(computeFreshness("2026-06-01T00:00:00Z", DEFAULT_FRESHNESS_THRESHOLDS, NOW)).toBe("stale");
  });

  it("respects configurable thresholds rather than a hardcoded cutoff", () => {
    const tightThresholds = { freshHours: 1, staleHours: 2 };
    expect(computeFreshness("2026-06-15T11:00:00Z", tightThresholds, NOW)).toBe("fresh"); // 1h ago
    expect(computeFreshness("2026-06-15T09:30:00Z", tightThresholds, NOW)).toBe("stale"); // 2.5h ago
  });
});

describe("formatFreshnessLabel", () => {
  it("reads 'just now' for anything under an hour", () => {
    expect(formatFreshnessLabel("2026-06-15T11:45:00Z", NOW)).toBe("Last updated: just now");
  });

  it("shows hours for same-day updates", () => {
    expect(formatFreshnessLabel("2026-06-15T09:00:00Z", NOW)).toBe("Last updated: 3 hours ago");
  });

  it("shows days for older updates", () => {
    expect(formatFreshnessLabel("2026-06-10T12:00:00Z", NOW)).toBe("Last updated: 5 days ago");
  });

  it("reads 'Never synced' with no timestamp", () => {
    expect(formatFreshnessLabel(null, NOW)).toBe("Never synced");
  });
});
