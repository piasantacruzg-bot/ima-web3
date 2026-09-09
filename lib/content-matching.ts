// Deterministic matching hierarchy for discovered social content (spec
// section 14): platform_post_id -> exact URL -> account + open content ->
// campaign window + creator + platform -> manual confirmation. Pure
// functions over already-fetched candidates — no DB access here — so the
// hierarchy itself is unit-testable without a database, and reusable by
// both the sync engine (lib/sync.ts) and the /content/matches review UI.
//
// Never auto-assigns an ambiguous match (spec: "Never automatically
// assign ambiguous content to a campaign").

import type { DeliverableContentType, SocialPlatform } from "@/types/database";

export interface DiscoveredPost {
  platformPostId: string;
  url: string;
  publishedAt: string | null;
  socialAccountId: string;
  creatorId: string;
  platform: SocialPlatform;
}

export interface ExistingContentPostRef {
  id: string;
  platformPostId: string | null;
  postUrl: string;
  deliverableId: string | null;
}

export interface MatchCandidateDeliverable {
  deliverableId: string;
  campaignId: string;
  campaignName: string;
  creatorId: string;
  platform: SocialPlatform;
  contentType: DeliverableContentType;
  dueDate: string | null;
  campaignStartDate: string | null;
  campaignEndDate: string | null;
  socialAccountId: string | null;
  alreadyHasContentPost: boolean;
}

export type MatchMethod = "platform_post_id" | "exact_url" | "account_and_content" | "campaign_window" | "manual";

export interface MatchCandidate {
  deliverableId: string;
  campaignId: string;
  campaignName: string;
  confidence: number;
}

export type MatchResult =
  | { status: "already_tracked"; method: MatchMethod; existingContentPostId: string; deliverableId: string | null }
  | { status: "matched"; method: MatchMethod; deliverableId: string; confidence: number }
  | { status: "ambiguous"; candidates: MatchCandidate[] }
  | { status: "unmatched" };

const WINDOW_SLACK_DAYS = 3;

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / (24 * 60 * 60 * 1000);
}

function isWithinCampaignWindow(candidate: MatchCandidateDeliverable, publishedAt: string | null): boolean {
  if (!publishedAt) return false;
  if (!candidate.campaignStartDate && !candidate.campaignEndDate) return true;
  const start = candidate.campaignStartDate ? new Date(candidate.campaignStartDate).getTime() - WINDOW_SLACK_DAYS * 86400000 : -Infinity;
  const end = candidate.campaignEndDate ? new Date(candidate.campaignEndDate).getTime() + WINDOW_SLACK_DAYS * 86400000 : Infinity;
  const published = new Date(publishedAt).getTime();
  return published >= start && published <= end;
}

function computeConfidence(candidate: MatchCandidateDeliverable, post: DiscoveredPost, sameAccount: boolean): number {
  let score = 40;
  if (sameAccount) score += 30;
  if (isWithinCampaignWindow(candidate, post.publishedAt)) score += 20;
  if (candidate.dueDate && post.publishedAt) {
    const distance = daysBetween(candidate.dueDate, post.publishedAt);
    score += Math.max(0, 10 - distance);
  }
  return Math.min(99, Math.round(score));
}

export function matchDiscoveredPost(
  post: DiscoveredPost,
  existingContentPosts: ExistingContentPostRef[],
  candidateDeliverables: MatchCandidateDeliverable[]
): MatchResult {
  // 1. platform_post_id — the strongest, idempotency-grade key.
  const byPlatformId = existingContentPosts.find((cp) => cp.platformPostId === post.platformPostId);
  if (byPlatformId) {
    return {
      status: "already_tracked",
      method: "platform_post_id",
      existingContentPostId: byPlatformId.id,
      deliverableId: byPlatformId.deliverableId,
    };
  }

  // 2. exact content URL.
  const byUrl = existingContentPosts.find((cp) => cp.postUrl === post.url);
  if (byUrl) {
    return { status: "already_tracked", method: "exact_url", existingContentPostId: byUrl.id, deliverableId: byUrl.deliverableId };
  }

  const openCandidates = candidateDeliverables.filter(
    (d) => d.creatorId === post.creatorId && d.platform === post.platform && !d.alreadyHasContentPost
  );
  if (openCandidates.length === 0) return { status: "unmatched" };

  // 3. social account + the only open deliverable for it.
  const sameAccount = openCandidates.filter((d) => d.socialAccountId === post.socialAccountId);
  if (sameAccount.length === 1) {
    return {
      status: "matched",
      method: "account_and_content",
      deliverableId: sameAccount[0].deliverableId,
      confidence: computeConfidence(sameAccount[0], post, true),
    };
  }

  // 4. campaign date window + creator + platform, narrowed further.
  const pool = sameAccount.length > 1 ? sameAccount : openCandidates;
  const withinWindow = pool.filter((d) => isWithinCampaignWindow(d, post.publishedAt));
  if (withinWindow.length === 1) {
    const isSameAccount = withinWindow[0].socialAccountId === post.socialAccountId;
    return {
      status: "matched",
      method: "campaign_window",
      deliverableId: withinWindow[0].deliverableId,
      confidence: computeConfidence(withinWindow[0], post, isSameAccount),
    };
  }

  // 5. still more than one plausible deliverable — never auto-assign.
  const ambiguousPool = withinWindow.length > 0 ? withinWindow : pool;
  return {
    status: "ambiguous",
    candidates: ambiguousPool.map((d) => ({
      deliverableId: d.deliverableId,
      campaignId: d.campaignId,
      campaignName: d.campaignName,
      confidence: computeConfidence(d, post, d.socialAccountId === post.socialAccountId),
    })),
  };
}
