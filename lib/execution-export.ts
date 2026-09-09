import type { TrackerItem } from "@/lib/execution";

// One row per independently-trackable item — a Story deliverable with 3
// instances produces 3 rows here, never one combined row (spec section
// 39). Shared by the per-campaign and global export routes so both stay
// identical.
export function toExportRow(item: TrackerItem) {
  return {
    campaign: item.campaignName,
    creator: item.creatorName,
    platform: item.platform,
    content_type: item.contentType,
    story_sequence: item.sequenceNumber,
    title: item.title,
    status: item.status,
    due_date: item.dueDate,
    published_at: item.publishedAt,
    content_url: item.contentUrl,
    has_evidence: item.hasEvidence,
    has_metrics: item.hasMetrics,
    has_url: item.hasUrl,
    completeness: item.completeness,
    needs_review: item.needsReview,
    views: item.metrics.views,
    reach: item.metrics.reach,
    impressions: item.metrics.impressions,
    likes: item.metrics.likes,
    comments: item.metrics.comments,
    shares: item.metrics.shares,
    reposts: item.metrics.reposts,
    saves: item.metrics.saves,
    clicks: item.metrics.clicks,
    engagements: item.metrics.engagements,
    engagement_rate: item.metrics.engagement_rate,
    engagement_rate_method: item.metrics.engagement_rate_method,
  };
}

export type ExportRow = ReturnType<typeof toExportRow>;
