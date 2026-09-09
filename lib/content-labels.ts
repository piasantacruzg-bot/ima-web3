import type { DeliverableContentType, DeliverableStatus, SocialPlatform } from "@/types/database";
import type { CompletenessState } from "@/lib/execution/completeness";
import type { IntegrationStatus } from "@/lib/integrations-status";

export const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  x: "X",
  youtube: "YouTube",
  facebook: "Facebook",
  other: "Other",
};

export const INTEGRATION_STATUS_LABEL: Record<IntegrationStatus, string> = {
  not_connected: "Not connected",
  connected: "Connected",
  needs_reauth: "Needs reauthorization",
  error: "Error",
  partial: "Partially available",
};

export const INTEGRATION_STATUS_STYLE: Record<IntegrationStatus, string> = {
  not_connected: "border-line text-ink-soft",
  connected: "border-status-success/30 text-status-success",
  needs_reauth: "border-status-warning/30 text-status-warning",
  error: "border-status-danger/30 text-status-danger",
  partial: "border-status-warning/30 text-status-warning",
};

export const CONTENT_TYPE_LABEL: Record<DeliverableContentType, string> = {
  instagram_reel: "Instagram Reel",
  instagram_post: "Instagram Post",
  instagram_carousel: "Instagram Carousel",
  instagram_story: "Instagram Story",
  tiktok: "TikTok",
  x_post: "X Post",
  youtube_short: "YouTube Short",
  youtube_video: "YouTube Video",
  facebook_post: "Facebook Post",
  other: "Other",
};

// Pipeline order for the Kanban board (spec section 18's status sequence,
// with the two non-linear terminal states — late, cancelled — trailing).
export const DELIVERABLE_STATUS_ORDER: DeliverableStatus[] = [
  "not_started",
  "assigned",
  "brief",
  "draft",
  "submitted",
  "in_review",
  "needs_revision",
  "approved",
  "scheduled",
  "published",
  "metrics_collected",
  "late",
  "cancelled",
];

export const DELIVERABLE_STATUS_LABEL: Record<DeliverableStatus, string> = {
  not_started: "Not started",
  assigned: "Assigned",
  brief: "Brief",
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  needs_revision: "Needs revision",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  metrics_collected: "Metrics collected",
  late: "Late",
  cancelled: "Cancelled",
};

export const DELIVERABLE_STATUS_STYLE: Record<DeliverableStatus, string> = {
  not_started: "border-line text-ink-soft",
  assigned: "border-line text-ink-soft",
  brief: "border-status-info/30 text-status-info",
  draft: "border-status-info/30 text-status-info",
  submitted: "border-status-warning/30 text-status-warning",
  in_review: "border-status-warning/30 text-status-warning",
  needs_revision: "border-status-danger/30 text-status-danger",
  approved: "border-status-success/30 text-status-success",
  scheduled: "border-status-info/30 text-status-info",
  published: "border-status-success/30 text-status-success",
  metrics_collected: "border-status-success/30 text-status-success",
  late: "border-status-danger/30 text-status-danger",
  cancelled: "border-line text-ink-soft",
};

export const COMPLETENESS_LABEL: Record<CompletenessState, string> = {
  complete: "Complete",
  partial: "Partial",
  missing: "Missing",
};

export const COMPLETENESS_STYLE: Record<CompletenessState, string> = {
  complete: "border-status-success/30 text-status-success",
  partial: "border-status-warning/30 text-status-warning",
  missing: "border-status-danger/30 text-status-danger",
};
