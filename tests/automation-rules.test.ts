import { describe, it, expect } from "vitest";
import { isDeliverableOverdue, isMetricsMissing, isEvidenceMissing, isConnectionExpired } from "@/lib/automation/rules";

const NOW = new Date("2026-06-15T00:00:00Z");

describe("isDeliverableOverdue", () => {
  it("is overdue when due_date is in the past and status isn't terminal", () => {
    expect(isDeliverableOverdue({ status: "draft", due_date: "2026-06-01" }, NOW)).toBe(true);
  });

  it("is not overdue when due_date is in the future", () => {
    expect(isDeliverableOverdue({ status: "draft", due_date: "2026-07-01" }, NOW)).toBe(false);
  });

  it("is never overdue once published, cancelled, or metrics_collected — even past due_date", () => {
    expect(isDeliverableOverdue({ status: "published", due_date: "2026-06-01" }, NOW)).toBe(false);
    expect(isDeliverableOverdue({ status: "cancelled", due_date: "2026-06-01" }, NOW)).toBe(false);
    expect(isDeliverableOverdue({ status: "metrics_collected", due_date: "2026-06-01" }, NOW)).toBe(false);
  });

  it("is never overdue with no due_date set", () => {
    expect(isDeliverableOverdue({ status: "draft", due_date: null }, NOW)).toBe(false);
  });
});

describe("isMetricsMissing", () => {
  it("is false when not published", () => {
    expect(isMetricsMissing({ isPublished: false, hasMetrics: false, publishedAt: null })).toBe(false);
  });

  it("is false when metrics already exist", () => {
    expect(isMetricsMissing({ isPublished: true, hasMetrics: true, publishedAt: "2026-06-14T00:00:00Z" }, 24, NOW)).toBe(false);
  });

  it("is true once published, missing metrics, and past the grace period", () => {
    expect(isMetricsMissing({ isPublished: true, hasMetrics: false, publishedAt: "2026-06-13T00:00:00Z" }, 24, NOW)).toBe(true);
  });

  it("is false within the grace period after publishing", () => {
    expect(isMetricsMissing({ isPublished: true, hasMetrics: false, publishedAt: "2026-06-14T23:00:00Z" }, 24, NOW)).toBe(false);
  });

  it("respects a configurable grace period, not a hardcoded one", () => {
    const input = { isPublished: true, hasMetrics: false, publishedAt: "2026-06-14T12:00:00Z" };
    expect(isMetricsMissing(input, 48, NOW)).toBe(false); // 12h since publish, 48h grace
    expect(isMetricsMissing(input, 6, NOW)).toBe(true); // 12h since publish, 6h grace
  });
});

describe("isEvidenceMissing", () => {
  it("is true only once published and with no evidence", () => {
    expect(isEvidenceMissing({ isPublished: true, hasEvidence: false })).toBe(true);
    expect(isEvidenceMissing({ isPublished: true, hasEvidence: true })).toBe(false);
    expect(isEvidenceMissing({ isPublished: false, hasEvidence: false })).toBe(false);
  });
});

describe("isConnectionExpired", () => {
  it("is true for an expired or errored oauth_status", () => {
    expect(isConnectionExpired({ oauth_status: "expired", sync_status: "synced" })).toBe(true);
    expect(isConnectionExpired({ oauth_status: "error", sync_status: "synced" })).toBe(true);
  });

  it("is true when sync_status is error even if oauth_status looks fine", () => {
    expect(isConnectionExpired({ oauth_status: "connected", sync_status: "error" })).toBe(true);
  });

  it("is false for a healthy connected account", () => {
    expect(isConnectionExpired({ oauth_status: "connected", sync_status: "synced" })).toBe(false);
  });
});
