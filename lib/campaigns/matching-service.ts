// Deterministic creator-matching engine (Phase 4 spec section 38:
// `creatorMatchingService`). Pure logic, no I/O, no AI — every score is
// reproducible from its inputs and every score is explainable (spec
// section 17/39: "do not create a black-box score").
//
// Hard vs soft (spec section 14/16): platform, location, creator status,
// minimum followers, minimum engagement, and required category are the
// only hard requirements — failing one never hides a creator, it lowers
// their eligibility tier and is named explicitly in
// `hardRequirementFailures`. Everything else (brand fit, rating, average
// views, historical performance, cost efficiency) is soft: it only moves
// the ranking, never the eligibility.

import type {
  CreatorRequirements,
  CreatorStatus,
  CreatorType,
  MatchingWeights,
  SocialPlatform,
} from "@/types/database";

export type Eligibility = "eligible" | "partial" | "ineligible";

export interface CreatorForMatching {
  id: string;
  displayName: string;
  status: CreatorStatus;
  creatorType: CreatorType | null;
  categories: string[];
  country: string | null;
  city: string | null;
  brandFitScore: number | null;
  internalRating: number | null;
  platforms: SocialPlatform[];
  followers: number | null;
  engagementRate: number | null;
  averageViews: number | null;
}

export interface CreatorHistoryForMatching {
  previousCampaignCount: number;
  completedDeliverables: number;
  totalDeliverables: number;
  averagePastFee: number | null;
}

export interface MatchCriteria extends CreatorRequirements {
  // Campaign.target_platforms lives as its own column, not inside the
  // creator_requirements jsonb — folded in here since matching treats it
  // as one more requirement dimension.
  platforms?: SocialPlatform[];
  // Never recommend "do_not_work_with" unless a human explicitly puts it
  // here (spec section 8's default-eligible list).
  allowedStatuses?: CreatorStatus[];
}

export type CriterionKey =
  | "platform"
  | "category"
  | "location"
  | "followers"
  | "engagement"
  | "views"
  | "brandFit"
  | "rating"
  | "historicalPerformance"
  | "costEfficiency";

export type MatchBreakdown = Record<CriterionKey, number>;

export interface MatchResult {
  score: number;
  eligibility: Eligibility;
  breakdown: MatchBreakdown;
  hardRequirementFailures: string[];
  strengths: string[];
  concerns: string[];
}

// Default weighting (spec section 15) — always sums to 100.
export const DEFAULT_MATCHING_WEIGHTS: Required<MatchingWeights> = {
  platform: 15,
  category: 15,
  location: 10,
  followers: 10,
  engagement: 15,
  views: 10,
  brandFit: 10,
  rating: 5,
  historicalPerformance: 5,
  costEfficiency: 5,
};

function resolveWeights(overrides: MatchingWeights | undefined): Required<MatchingWeights> {
  return { ...DEFAULT_MATCHING_WEIGHTS, ...overrides };
}

const NEUTRAL_UNKNOWN_SCORE = 50;

// Range-fit scoring shared by followers/engagement/views: within [min,max]
// scores 100; below min or above max scores proportionally to how close it
// is, so ranking among imperfect matches is still meaningful — never a
// flat 0 for "close but not quite."
function rangeScore(value: number, min: number | undefined, max: number | undefined): number {
  if (min !== undefined && value < min) {
    if (min <= 0) return 0;
    return Math.max(0, Math.min(100, (value / min) * 100));
  }
  if (max !== undefined && value > max) {
    if (value <= 0) return 100;
    return Math.max(0, Math.min(100, (max / value) * 100));
  }
  return 100;
}

function overlaps(a: string[], b: string[]): boolean {
  const setB = new Set(b.map((x) => x.toLowerCase()));
  return a.some((x) => setB.has(x.toLowerCase()));
}

// Named `creatorMatchingService` per spec section 38. The spec's separate
// `creator` and `creatorPerformance` inputs are consolidated into one
// `CreatorForMatching` object — the app's `creators_with_stats` view
// already merges a creator with its computed social-account stats
// (max followers, avg engagement, max average views), so there's no
// second "performance" object to pass separately.
export function creatorMatchingService(
  requirements: MatchCriteria,
  creator: CreatorForMatching,
  history: CreatorHistoryForMatching | null,
  weightsOverride?: MatchingWeights
): MatchResult {
  const weights = resolveWeights(weightsOverride);
  const hardRequirementFailures: string[] = [];
  const strengths: string[] = [];
  const concerns: string[] = [];

  // --- Hard requirement: creator status ---------------------------------
  // Default allowlist is approved/active; do_not_work_with is only ever
  // reachable via an explicit override (spec section 8, non-negotiable
  // principle 7).
  const allowedStatuses = requirements.allowedStatuses ?? ["approved", "active"];
  if (!allowedStatuses.includes(creator.status)) {
    hardRequirementFailures.push(`Creator status "${creator.status}" is not eligible for recommendation`);
  }

  // --- Platform (hard + scored) ------------------------------------------
  // A campaign requiring multiple platforms is satisfied by a creator
  // active on *any one* of them — requiring every creator to be on every
  // listed platform would be unusually strict for how campaigns actually
  // staff a roster across platforms.
  let platformScore = 100;
  if (requirements.platforms && requirements.platforms.length > 0) {
    const hasPlatform = requirements.platforms.some((p) => creator.platforms.includes(p));
    platformScore = hasPlatform ? 100 : 0;
    if (!hasPlatform) {
      hardRequirementFailures.push(`Not active on a required platform (${requirements.platforms.join(", ")})`);
    } else {
      strengths.push(`Active on a required platform`);
    }
  }

  // --- Category (hard + scored) ------------------------------------------
  let categoryScore = 100;
  if (requirements.categories && requirements.categories.length > 0) {
    const matches = overlaps(creator.categories, requirements.categories);
    categoryScore = matches ? 100 : 0;
    if (!matches) {
      hardRequirementFailures.push(`Does not match a required category (${requirements.categories.join(", ")})`);
    } else {
      strengths.push(`Matches a required category`);
    }
  }

  // --- Location (hard + scored) -------------------------------------------
  let locationScore = 100;
  if (requirements.locations && requirements.locations.length > 0) {
    if (!creator.country && !creator.city) {
      locationScore = NEUTRAL_UNKNOWN_SCORE;
      hardRequirementFailures.push("Location unknown — cannot confirm it meets the requirement");
      concerns.push("Location unknown");
    } else {
      const creatorLocations = [creator.city, creator.country].filter((v): v is string => Boolean(v));
      const matches = overlaps(creatorLocations, requirements.locations);
      locationScore = matches ? 100 : 0;
      if (!matches) {
        hardRequirementFailures.push(`Not in a required location (${requirements.locations.join(", ")})`);
      } else {
        strengths.push(`Located in ${creator.city ?? creator.country}`);
      }
    }
  }

  // --- Followers (hard minimum + scored range) ----------------------------
  let followersScore = 100;
  if (creator.followers === null) {
    followersScore = NEUTRAL_UNKNOWN_SCORE;
    if (requirements.min_followers !== undefined) {
      hardRequirementFailures.push("Follower count unknown — cannot confirm the minimum is met");
    }
    concerns.push("Follower count not available");
  } else {
    followersScore = rangeScore(creator.followers, requirements.min_followers, requirements.max_followers);
    if (requirements.min_followers !== undefined && creator.followers < requirements.min_followers) {
      hardRequirementFailures.push(
        `Below minimum followers (${creator.followers.toLocaleString()} < ${requirements.min_followers.toLocaleString()})`
      );
    } else if (followersScore === 100) {
      strengths.push(`${creator.followers.toLocaleString()} followers`);
    }
  }

  // --- Engagement (hard minimum + scored range) ---------------------------
  let engagementScore = 100;
  if (creator.engagementRate === null) {
    engagementScore = NEUTRAL_UNKNOWN_SCORE;
    if (requirements.min_engagement !== undefined) {
      hardRequirementFailures.push("Engagement rate unknown — cannot confirm the minimum is met");
    }
    concerns.push("Engagement rate not available");
  } else {
    engagementScore = rangeScore(creator.engagementRate, requirements.min_engagement, requirements.max_engagement);
    if (requirements.min_engagement !== undefined && creator.engagementRate < requirements.min_engagement) {
      hardRequirementFailures.push(
        `Below minimum engagement rate (${creator.engagementRate}% < ${requirements.min_engagement}%)`
      );
    } else if (engagementScore === 100) {
      strengths.push(`${creator.engagementRate}% engagement rate`);
    }
  }

  // --- Average views (soft only) ------------------------------------------
  let viewsScore = 100;
  if (creator.averageViews === null) {
    viewsScore = NEUTRAL_UNKNOWN_SCORE;
    concerns.push("Average views not available");
  } else {
    viewsScore = rangeScore(creator.averageViews, requirements.min_average_views, requirements.max_average_views);
  }

  // --- Brand fit (soft only) -----------------------------------------------
  let brandFitScore = NEUTRAL_UNKNOWN_SCORE;
  if (creator.brandFitScore !== null) {
    brandFitScore = creator.brandFitScore;
    if (requirements.min_brand_fit !== undefined && creator.brandFitScore < requirements.min_brand_fit) {
      concerns.push(`Brand fit (${creator.brandFitScore}) below preferred minimum (${requirements.min_brand_fit})`);
    } else if (creator.brandFitScore >= 80) {
      strengths.push("Strong brand fit");
    }
  } else {
    concerns.push("Brand fit not scored");
  }

  // --- Internal rating (soft only) -----------------------------------------
  let ratingScore = NEUTRAL_UNKNOWN_SCORE;
  if (creator.internalRating !== null) {
    ratingScore = (creator.internalRating / 5) * 100;
    if (requirements.min_rating !== undefined && creator.internalRating < requirements.min_rating) {
      concerns.push(`Internal rating (${creator.internalRating}) below preferred minimum (${requirements.min_rating})`);
    }
  } else {
    concerns.push("Internal rating not set");
  }

  // --- Historical performance (soft only) -----------------------------------
  // No history is never treated as poor performance (spec section 21) —
  // it's treated as neutral, with the gap named explicitly.
  let historicalPerformanceScore = NEUTRAL_UNKNOWN_SCORE;
  if (history && history.previousCampaignCount > 0) {
    const completionRate =
      history.totalDeliverables > 0 ? history.completedDeliverables / history.totalDeliverables : null;
    if (completionRate !== null) {
      historicalPerformanceScore = completionRate * 100;
      if (completionRate >= 0.9) strengths.push("Strong history of completing deliverables");
      else if (completionRate < 0.5) concerns.push("Low deliverable completion rate in past campaigns");
    }
    if (history.previousCampaignCount >= 3) strengths.push(`${history.previousCampaignCount} previous campaigns`);
  } else {
    concerns.push("Insufficient historical data");
  }

  // --- Cost efficiency (soft only) ------------------------------------------
  let costEfficiencyScore = NEUTRAL_UNKNOWN_SCORE;
  const referenceBudget = requirements.budget_per_creator;
  if (referenceBudget && history?.averagePastFee) {
    costEfficiencyScore =
      history.averagePastFee <= referenceBudget
        ? 100
        : Math.max(0, Math.min(100, (referenceBudget / history.averagePastFee) * 100));
    if (history.averagePastFee > referenceBudget) {
      concerns.push("Past fee above this campaign's per-creator budget");
    }
  } else {
    concerns.push("Insufficient fee history for cost-efficiency scoring");
  }

  const breakdown: MatchBreakdown = {
    platform: platformScore,
    category: categoryScore,
    location: locationScore,
    followers: followersScore,
    engagement: engagementScore,
    views: viewsScore,
    brandFit: brandFitScore,
    rating: ratingScore,
    historicalPerformance: historicalPerformanceScore,
    costEfficiency: costEfficiencyScore,
  };

  const weightSum = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const score =
    (Object.keys(breakdown) as CriterionKey[]).reduce(
      (sum, key) => sum + breakdown[key] * weights[key],
      0
    ) / weightSum;

  // Eligibility: any hard failure caused only by missing data (not a
  // confirmed mismatch) still counts toward the tier — it means the
  // creator's fit genuinely cannot be confirmed, which is exactly what
  // "partial" communicates.
  const eligibility: Eligibility =
    hardRequirementFailures.length === 0
      ? "eligible"
      : hardRequirementFailures.length === 1
        ? "partial"
        : "ineligible";

  return {
    score: Math.round(score * 10) / 10,
    eligibility,
    breakdown,
    hardRequirementFailures,
    strengths,
    concerns,
  };
}
