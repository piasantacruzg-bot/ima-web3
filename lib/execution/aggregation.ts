// Metric aggregation: CONTENT -> DELIVERABLE -> CREATOR -> CAMPAIGN (spec
// section 25). Pure functions over already-fetched rows — no I/O here,
// so the same primitive (`sumMetrics`) is reused at every level rather
// than writing three different summation routines. Nothing here computes
// or stores a duplicate aggregate in the database (spec: "prefer computed
// queries/services"); the DB-fetching wrapper lives in lib/execution.ts.
//
// A deliverable's own aggregate is never a raw average of percentage
// rates — engagement_rate is always recomputed from the *summed* raw
// components at whatever level you're aggregating to, since averaging
// rates across posts of very different size is statistically wrong.
// "Average engagement rate" (spec sections 23/24/26) is a distinct,
// separate figure: the mean of each deliverable's own already-computed
// rate — exposed here as `averageEngagementRate`.

import { calculateEngagements, calculateEngagementRate, type EngagementComponents } from "@/lib/execution/kpi";
import type { EngagementRateMethod } from "@/types/database";

export interface RawMetricSnapshot extends EngagementComponents {
  views?: number | null;
  reach?: number | null;
  impressions?: number | null;
  clicks?: number | null;
  replies?: number | null;
  engagements?: number | null;
  link_clicks?: number | null;
  website_clicks?: number | null;
  cta_clicks?: number | null;
  sticker_taps?: number | null;
  forward_taps?: number | null;
  back_taps?: number | null;
  exits?: number | null;
  video_starts?: number | null;
  three_second_views?: number | null;
}

export interface AggregatedMetrics {
  views: number | null;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  reposts: number | null;
  saves: number | null;
  clicks: number | null;
  replies: number | null;
  engagements: number | null;
  engagement_rate: number | null;
  engagement_rate_method: EngagementRateMethod | null;
  link_clicks: number | null;
  website_clicks: number | null;
  cta_clicks: number | null;
  sticker_taps: number | null;
  forward_taps: number | null;
  back_taps: number | null;
  exits: number | null;
  video_starts: number | null;
  three_second_views: number | null;
}

const ADDITIVE_FIELDS: (keyof RawMetricSnapshot)[] = [
  "views",
  "reach",
  "impressions",
  "likes",
  "comments",
  "shares",
  "reposts",
  "saves",
  "clicks",
  "replies",
  "engagements",
  "link_clicks",
  "website_clicks",
  "cta_clicks",
  "sticker_taps",
  "forward_taps",
  "back_taps",
  "exits",
  "video_starts",
  "three_second_views",
];

// Sums a field across snapshots — returns null (never 0) when every
// snapshot is missing that field, so "no data recorded" stays
// distinguishable from "recorded as zero" all the way up the aggregation
// chain (spec section 42).
function sumField(snapshots: RawMetricSnapshot[], field: keyof RawMetricSnapshot): number | null {
  let sum = 0;
  let anyPresent = false;
  for (const snapshot of snapshots) {
    const value = snapshot[field];
    if (value !== null && value !== undefined) {
      sum += value;
      anyPresent = true;
    }
  }
  return anyPresent ? sum : null;
}

// The one aggregation primitive, reused at every level of CONTENT ->
// DELIVERABLE -> CREATOR -> CAMPAIGN: sum every additive field, then
// recompute engagements/engagement_rate fresh from the totals rather than
// carrying forward (or averaging) whatever rate each input already had.
export function sumMetrics(snapshots: RawMetricSnapshot[]): AggregatedMetrics {
  const summed: Record<string, number | null> = {};
  for (const field of ADDITIVE_FIELDS) {
    summed[field] = sumField(snapshots, field);
  }

  const engagements = summed.engagements ?? calculateEngagements(summed as EngagementComponents);
  const { rate, method } = calculateEngagementRate(engagements, {
    reach: summed.reach,
    impressions: summed.impressions,
  });

  return {
    views: summed.views,
    reach: summed.reach,
    impressions: summed.impressions,
    likes: summed.likes,
    comments: summed.comments,
    shares: summed.shares,
    reposts: summed.reposts,
    saves: summed.saves,
    clicks: summed.clicks,
    replies: summed.replies,
    engagements,
    engagement_rate: rate,
    engagement_rate_method: method,
    link_clicks: summed.link_clicks,
    website_clicks: summed.website_clicks,
    cta_clicks: summed.cta_clicks,
    sticker_taps: summed.sticker_taps,
    forward_taps: summed.forward_taps,
    back_taps: summed.back_taps,
    exits: summed.exits,
    video_starts: summed.video_starts,
    three_second_views: summed.three_second_views,
  };
}

// The mean of each deliverable's own engagement rate — a different
// question from "what's the blended rate across all the content" (that's
// sumMetrics(...).engagement_rate). Excludes N/A entries rather than
// treating them as 0; returns null when nothing has a rate yet.
export function averageEngagementRate(rates: (number | null)[]): number | null {
  const known = rates.filter((r): r is number => r !== null);
  if (known.length === 0) return null;
  return Math.round((known.reduce((a, b) => a + b, 0) / known.length) * 100) / 100;
}
