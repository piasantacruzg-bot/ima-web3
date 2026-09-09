import { describe, it, expect } from "vitest";
import {
  calculateEngagements,
  calculateEngagementRate,
  calculateCostPerView,
  calculateCostPerReach,
  calculateCostPerEngagement,
  calculateCostPerClick,
  calculateCPM,
} from "@/lib/execution/kpi";

describe("calculateEngagements", () => {
  it("sums the default components", () => {
    expect(calculateEngagements({ likes: 100, comments: 20, shares: 10, saves: 5, reposts: 2 })).toBe(137);
  });

  it("treats a missing component as absent from the sum, not zero", () => {
    expect(calculateEngagements({ likes: 100, comments: null })).toBe(100);
  });

  it("still sums a real recorded zero", () => {
    expect(calculateEngagements({ likes: 100, comments: 0 })).toBe(100);
  });

  it("returns null when every component is missing, not 0", () => {
    expect(calculateEngagements({})).toBeNull();
    expect(calculateEngagements({ likes: null, comments: undefined })).toBeNull();
  });

  it("honors a custom field list for a platform without a given metric", () => {
    // A platform with no "saves" concept: engagements should never
    // silently include a missing "saves" as though it were data.
    const result = calculateEngagements({ likes: 50, comments: 10, saves: null }, ["likes", "comments", "shares"]);
    expect(result).toBe(60);
  });
});

describe("calculateEngagementRate", () => {
  it("calculates by reach when reach is available", () => {
    const result = calculateEngagementRate(500, { reach: 10_000 });
    expect(result.rate).toBe(5);
    expect(result.method).toBe("reach");
  });

  it("falls back to impressions when reach is missing", () => {
    const result = calculateEngagementRate(500, { reach: null, impressions: 20_000 });
    expect(result.rate).toBe(2.5);
    expect(result.method).toBe("impressions");
  });

  it("falls back to followers when reach and impressions are both missing", () => {
    const result = calculateEngagementRate(500, { followers: 25_000 });
    expect(result.rate).toBe(2);
    expect(result.method).toBe("followers");
  });

  it("returns N/A (null) when no denominator is available", () => {
    const result = calculateEngagementRate(500, {});
    expect(result.rate).toBeNull();
    expect(result.method).toBeNull();
  });

  it("returns N/A when engagements themselves are unknown", () => {
    const result = calculateEngagementRate(null, { reach: 10_000 });
    expect(result.rate).toBeNull();
  });

  it("never divides by a zero denominator", () => {
    const result = calculateEngagementRate(500, { reach: 0, impressions: 0, followers: 0 });
    expect(result.rate).toBeNull();
  });

  it("respects a custom priority order", () => {
    const result = calculateEngagementRate(500, { reach: 10_000, followers: 25_000 }, ["followers", "reach"]);
    expect(result.method).toBe("followers");
  });
});

describe("cost-based KPIs — never divide by zero, never fabricate", () => {
  it("calculates cost per view/reach/engagement/click normally", () => {
    expect(calculateCostPerView(1000, 50_000)).toBe(0.02);
    expect(calculateCostPerReach(1000, 40_000)).toBe(0.03);
    expect(calculateCostPerEngagement(1000, 2_000)).toBe(0.5);
    expect(calculateCostPerClick(1000, 500)).toBe(2);
  });

  it("calculates CPM per 1,000 impressions", () => {
    expect(calculateCPM(1000, 100_000)).toBe(10);
  });

  it("returns null (N/A) when cost is unknown", () => {
    expect(calculateCostPerView(null, 50_000)).toBeNull();
  });

  it("returns null (N/A) when the count is unknown", () => {
    expect(calculateCostPerView(1000, null)).toBeNull();
  });

  it("returns null rather than dividing by zero", () => {
    expect(calculateCostPerView(1000, 0)).toBeNull();
    expect(calculateCPM(1000, 0)).toBeNull();
  });
});
