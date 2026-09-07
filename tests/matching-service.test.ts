import { describe, it, expect } from "vitest";
import {
  creatorMatchingService,
  DEFAULT_MATCHING_WEIGHTS,
  type CreatorForMatching,
  type CreatorHistoryForMatching,
  type MatchCriteria,
} from "@/lib/campaigns/matching-service";

function creator(overrides: Partial<CreatorForMatching>): CreatorForMatching {
  return {
    id: "c1",
    displayName: "Test Creator",
    status: "active",
    creatorType: "micro",
    categories: ["Fashion"],
    country: "USA",
    city: "Miami",
    brandFitScore: 85,
    internalRating: 4,
    platforms: ["instagram"],
    followers: 120_000,
    engagementRate: 5.8,
    averageViews: 40_000,
    ...overrides,
  };
}

const noHistory: CreatorHistoryForMatching | null = null;

describe("creatorMatchingService — the section 16 worked example", () => {
  const requirements: MatchCriteria = {
    platforms: ["instagram"],
    categories: ["Fashion"],
    locations: ["Miami"],
    min_followers: 50_000,
  };

  it("is eligible when every hard requirement is met", () => {
    const result = creatorMatchingService(requirements, creator({}), noHistory);
    expect(result.eligibility).toBe("eligible");
    expect(result.hardRequirementFailures).toEqual([]);
  });

  it("is not fully eligible when only location fails, but is still scored and explained rather than hidden", () => {
    const result = creatorMatchingService(requirements, creator({ city: "Lima", country: "Peru" }), noHistory);
    expect(result.eligibility).toBe("partial");
    expect(result.hardRequirementFailures).toHaveLength(1);
    expect(result.hardRequirementFailures[0]).toMatch(/location/i);
    expect(result.score).toBeGreaterThan(0);
  });

  it("becomes ineligible once two or more hard requirements fail", () => {
    const result = creatorMatchingService(
      requirements,
      creator({ city: "Lima", country: "Peru", categories: ["Tech"] }),
      noHistory
    );
    expect(result.eligibility).toBe("ineligible");
    expect(result.hardRequirementFailures.length).toBeGreaterThanOrEqual(2);
  });
});

describe("creatorMatchingService — hard requirements", () => {
  it("fails on a missing required platform", () => {
    const result = creatorMatchingService(
      { platforms: ["tiktok"] },
      creator({ platforms: ["instagram"] }),
      noHistory
    );
    expect(result.hardRequirementFailures.some((f) => /platform/i.test(f))).toBe(true);
  });

  it("passes platform when the creator has at least one of several required platforms", () => {
    const result = creatorMatchingService(
      { platforms: ["tiktok", "instagram"] },
      creator({ platforms: ["instagram"] }),
      noHistory
    );
    expect(result.hardRequirementFailures.some((f) => /platform/i.test(f))).toBe(false);
    expect(result.breakdown.platform).toBe(100);
  });

  it("fails below the minimum follower count", () => {
    const result = creatorMatchingService({ min_followers: 100_000 }, creator({ followers: 40_000 }), noHistory);
    expect(result.hardRequirementFailures.some((f) => /minimum followers/i.test(f))).toBe(true);
  });

  it("fails below the minimum engagement rate", () => {
    const result = creatorMatchingService({ min_engagement: 6 }, creator({ engagementRate: 3 }), noHistory);
    expect(result.hardRequirementFailures.some((f) => /engagement/i.test(f))).toBe(true);
  });

  it("never recommends a do_not_work_with creator by default", () => {
    const result = creatorMatchingService({}, creator({ status: "do_not_work_with" }), noHistory);
    expect(result.hardRequirementFailures.some((f) => /status/i.test(f))).toBe(true);
  });

  it("allows do_not_work_with only via an explicit override", () => {
    const result = creatorMatchingService(
      { allowedStatuses: ["do_not_work_with"] },
      creator({ status: "do_not_work_with" }),
      noHistory
    );
    expect(result.hardRequirementFailures.some((f) => /status/i.test(f))).toBe(false);
  });

  it("rejects a prospect by default (only approved/active are eligible)", () => {
    const result = creatorMatchingService({}, creator({ status: "prospect" }), noHistory);
    expect(result.hardRequirementFailures.some((f) => /status/i.test(f))).toBe(true);
  });
});

describe("creatorMatchingService — soft requirements never gate eligibility", () => {
  it("a low brand fit score does not create a hard requirement failure", () => {
    const result = creatorMatchingService({ min_brand_fit: 90 }, creator({ brandFitScore: 40 }), noHistory);
    expect(result.eligibility).toBe("eligible");
    expect(result.concerns.some((c) => /brand fit/i.test(c))).toBe(true);
  });

  it("a max-followers overage is soft, not a hard failure", () => {
    const result = creatorMatchingService({ max_followers: 50_000 }, creator({ followers: 500_000 }), noHistory);
    expect(result.eligibility).toBe("eligible");
    expect(result.breakdown.followers).toBeLessThan(100);
  });

  it("average views requirements are soft only", () => {
    const result = creatorMatchingService({ min_average_views: 1_000_000 }, creator({ averageViews: 1000 }), noHistory);
    expect(result.eligibility).toBe("eligible");
  });
});

describe("creatorMatchingService — missing-data edge cases (spec section 40)", () => {
  it("does not treat missing followers as zero", () => {
    const result = creatorMatchingService({}, creator({ followers: null }), noHistory);
    expect(result.breakdown.followers).toBeGreaterThan(0);
    expect(result.concerns.some((c) => /follower/i.test(c))).toBe(true);
  });

  it("treats a required-but-missing follower count as an unconfirmed hard requirement", () => {
    const result = creatorMatchingService({ min_followers: 10_000 }, creator({ followers: null }), noHistory);
    expect(result.hardRequirementFailures.some((f) => /unknown/i.test(f))).toBe(true);
  });

  it("does not treat missing engagement as zero", () => {
    const result = creatorMatchingService({}, creator({ engagementRate: null }), noHistory);
    expect(result.breakdown.engagement).toBeGreaterThan(0);
  });

  it("does not treat missing average views as zero", () => {
    const result = creatorMatchingService({}, creator({ averageViews: null }), noHistory);
    expect(result.breakdown.views).toBeGreaterThan(0);
  });

  it("marks unknown location rather than assuming a match or a mismatch", () => {
    const result = creatorMatchingService(
      { locations: ["Miami"] },
      creator({ city: null, country: null }),
      noHistory
    );
    expect(result.concerns.some((c) => /location unknown/i.test(c))).toBe(true);
  });

  it("does not penalize a creator with no historical campaign data as 'poor performance'", () => {
    const result = creatorMatchingService({}, creator({}), noHistory);
    expect(result.concerns.some((c) => /insufficient historical data/i.test(c))).toBe(true);
    expect(result.concerns.some((c) => /poor performance/i.test(c))).toBe(false);
    expect(result.breakdown.historicalPerformance).toBe(50);
  });
});

describe("creatorMatchingService — historical performance", () => {
  it("scores a strong completion history highly", () => {
    const history: CreatorHistoryForMatching = {
      previousCampaignCount: 5,
      completedDeliverables: 19,
      totalDeliverables: 20,
      averagePastFee: 1000,
    };
    const result = creatorMatchingService({}, creator({}), history);
    expect(result.breakdown.historicalPerformance).toBeGreaterThan(90);
    expect(result.strengths.some((s) => /completing deliverables/i.test(s))).toBe(true);
  });

  it("flags a low completion rate as a concern", () => {
    const history: CreatorHistoryForMatching = {
      previousCampaignCount: 2,
      completedDeliverables: 1,
      totalDeliverables: 4,
      averagePastFee: 1000,
    };
    const result = creatorMatchingService({}, creator({}), history);
    expect(result.concerns.some((c) => /low deliverable completion/i.test(c))).toBe(true);
  });
});

describe("creatorMatchingService — cost efficiency", () => {
  it("scores efficiently when past fee is within budget", () => {
    const history: CreatorHistoryForMatching = {
      previousCampaignCount: 1,
      completedDeliverables: 1,
      totalDeliverables: 1,
      averagePastFee: 800,
    };
    const result = creatorMatchingService({ budget_per_creator: 1500 }, creator({}), history);
    expect(result.breakdown.costEfficiency).toBe(100);
  });

  it("flags a past fee above the campaign's per-creator budget", () => {
    const history: CreatorHistoryForMatching = {
      previousCampaignCount: 1,
      completedDeliverables: 1,
      totalDeliverables: 1,
      averagePastFee: 5000,
    };
    const result = creatorMatchingService({ budget_per_creator: 1500 }, creator({}), history);
    expect(result.concerns.some((c) => /above this campaign's per-creator budget/i.test(c))).toBe(true);
    expect(result.breakdown.costEfficiency).toBeLessThan(100);
  });
});

describe("creatorMatchingService — configurable weights", () => {
  it("changing a weight changes the final score deterministically", () => {
    const requirements: MatchCriteria = { min_engagement: 1 };
    const lowEngagementCreator = creator({ engagementRate: 1.2, followers: 20_000 });

    const defaultResult = creatorMatchingService(requirements, lowEngagementCreator, noHistory);
    const engagementHeavyResult = creatorMatchingService(requirements, lowEngagementCreator, noHistory, {
      engagement: 80,
      platform: 2,
      category: 2,
      location: 2,
      followers: 2,
      views: 2,
      brandFit: 2,
      rating: 2,
      historicalPerformance: 2,
      costEfficiency: 2,
    });

    // Weighting engagement far more heavily should pull the score toward
    // the engagement criterion's own (lower relative) score.
    expect(engagementHeavyResult.score).not.toBe(defaultResult.score);
  });

  it("default weights sum to 100", () => {
    const total = Object.values(DEFAULT_MATCHING_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(100);
  });

  it("is deterministic — identical inputs always produce identical output", () => {
    const requirements: MatchCriteria = { platforms: ["instagram"], min_followers: 10_000 };
    const c = creator({});
    const r1 = creatorMatchingService(requirements, c, noHistory);
    const r2 = creatorMatchingService(requirements, c, noHistory);
    expect(r1).toEqual(r2);
  });
});
