// KPI / engagement / engagement-rate math (spec sections 13, 26). Pure
// functions — every one treats "missing" and "zero" as genuinely
// different things (spec section 42: never turn missing data into 0),
// and every rate/ratio returns null ("N/A") rather than dividing by zero
// or inventing a number when its denominator is unavailable.

import type { EngagementRateMethod } from "@/types/database";

export interface EngagementComponents {
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  saves?: number | null;
  reposts?: number | null;
}

const DEFAULT_ENGAGEMENT_FIELDS: (keyof EngagementComponents)[] = [
  "likes",
  "comments",
  "shares",
  "saves",
  "reposts",
];

// Sums only the components that are actually present. Returns null (not 0)
// when every relevant component is missing — there is a real difference
// between "this post has zero comments" and "we never recorded comments
// for this post." A configurable field list is the "never silently mix
// incompatible platform definitions" knob from spec section 13: a caller
// tracking a platform that doesn't expose "saves" passes a field list
// without it, rather than the default silently treating a missing "saves"
// the same as a real zero.
export function calculateEngagements(
  input: EngagementComponents,
  fields: (keyof EngagementComponents)[] = DEFAULT_ENGAGEMENT_FIELDS
): number | null {
  let sum = 0;
  let anyPresent = false;
  for (const field of fields) {
    const value = input[field];
    if (value !== null && value !== undefined) {
      sum += value;
      anyPresent = true;
    }
  }
  return anyPresent ? sum : null;
}

export interface EngagementRateDenominators {
  reach?: number | null;
  impressions?: number | null;
  followers?: number | null;
}

export interface EngagementRateResult {
  rate: number | null;
  method: EngagementRateMethod | null;
}

// Picks the first available (non-null, positive) denominator in priority
// order and computes engagements/denominator as a percentage — never
// silently falling back to a different method than the one recorded, and
// never dividing by a zero or missing denominator (spec section 13: "If
// the denominator is missing: N/A. Never invent the number.").
export function calculateEngagementRate(
  engagements: number | null,
  denominators: EngagementRateDenominators,
  priority: EngagementRateMethod[] = ["reach", "impressions", "followers"]
): EngagementRateResult {
  if (engagements === null) return { rate: null, method: null };

  for (const method of priority) {
    const denominator = denominators[method];
    if (denominator !== null && denominator !== undefined && denominator > 0) {
      return { rate: Math.round((engagements / denominator) * 100 * 100) / 100, method };
    }
  }
  return { rate: null, method: null };
}

// Cost-based KPIs (spec section 26). `total` is the metric count (views,
// reach, clicks, engagements — whatever the "per" is); `cpmBasis` for
// calculateCPM is impressions, scaled per 1,000 by convention.
function costPer(cost: number | null, count: number | null): number | null {
  if (cost === null || count === null || count <= 0) return null;
  return Math.round((cost / count) * 100) / 100;
}

export function calculateCostPerView(cost: number | null, views: number | null): number | null {
  return costPer(cost, views);
}

export function calculateCostPerReach(cost: number | null, reach: number | null): number | null {
  return costPer(cost, reach);
}

export function calculateCostPerEngagement(cost: number | null, engagements: number | null): number | null {
  return costPer(cost, engagements);
}

export function calculateCostPerClick(cost: number | null, clicks: number | null): number | null {
  return costPer(cost, clicks);
}

export function calculateCPM(cost: number | null, impressions: number | null): number | null {
  if (cost === null || impressions === null || impressions <= 0) return null;
  return Math.round((cost / impressions) * 1000 * 100) / 100;
}
