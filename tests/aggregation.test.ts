import { describe, it, expect } from "vitest";
import { sumMetrics, averageEngagementRate, type RawMetricSnapshot } from "@/lib/execution/aggregation";

describe("sumMetrics", () => {
  it("sums additive fields across snapshots", () => {
    const result = sumMetrics([
      { views: 1000, likes: 100 },
      { views: 2000, likes: 200 },
    ]);
    expect(result.views).toBe(3000);
    expect(result.likes).toBe(300);
  });

  it("returns null (not 0) for a field missing from every snapshot", () => {
    const result = sumMetrics([{ views: 1000 }, { views: 2000 }]);
    expect(result.impressions).toBeNull();
  });

  it("sums a field even when some snapshots have it and others don't", () => {
    const result = sumMetrics([{ views: 1000, reach: 800 }, { views: 2000 }]);
    expect(result.reach).toBe(800);
  });

  it("recomputes engagements from summed components rather than trusting a stale precomputed value", () => {
    const result = sumMetrics([
      { likes: 100, comments: 10 },
      { likes: 200, comments: 20 },
    ]);
    expect(result.engagements).toBe(330);
  });

  it("recomputes engagement_rate from summed totals, not by averaging per-snapshot rates", () => {
    // Two posts: one small (1000 reach, 100 engagements = 10%), one huge
    // (100,000 reach, 100 engagements = 0.1%). A naive average of rates
    // would say ~5.05%; the blended rate from totals is ~0.198%.
    const result = sumMetrics([
      { likes: 100, reach: 1000 },
      { likes: 100, reach: 100_000 },
    ]);
    expect(result.reach).toBe(101_000);
    expect(result.engagements).toBe(200);
    expect(result.engagement_rate).toBeCloseTo((200 / 101_000) * 100, 2);
  });

  it("is reusable at every aggregation level (content -> deliverable -> creator -> campaign)", () => {
    // Deliverable 1 = sum of its own content snapshots.
    const deliverable1 = sumMetrics([{ views: 85_000, likes: 5200, reach: 72_000 }]);
    // Deliverable 2 (a 3-instance Story) = sum of its 3 story snapshots.
    const deliverable2 = sumMetrics([
      { views: 18_000, replies: 40 },
      { views: 16_000, replies: 25 },
      { views: 14_000, replies: 18 },
    ]);
    // Creator total = sum of that creator's deliverable aggregates.
    const creatorTotal = sumMetrics([deliverable1 as RawMetricSnapshot, deliverable2 as RawMetricSnapshot]);
    expect(creatorTotal.views).toBe(85_000 + 18_000 + 16_000 + 14_000);
    expect(creatorTotal.replies).toBe(83);

    // Campaign total = sum across creators (here, just the one).
    const campaignTotal = sumMetrics([creatorTotal as RawMetricSnapshot]);
    expect(campaignTotal.views).toBe(creatorTotal.views);
  });

  it("returns an all-null shape for an empty input rather than zeros", () => {
    const result = sumMetrics([]);
    expect(result.views).toBeNull();
    expect(result.engagements).toBeNull();
    expect(result.engagement_rate).toBeNull();
  });
});

describe("averageEngagementRate", () => {
  it("averages known rates only", () => {
    expect(averageEngagementRate([5, 10, null, 15])).toBe(10);
  });

  it("returns null when nothing has a rate yet", () => {
    expect(averageEngagementRate([null, null])).toBeNull();
  });

  it("returns null for an empty list", () => {
    expect(averageEngagementRate([])).toBeNull();
  });
});
