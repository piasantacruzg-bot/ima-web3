"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { checkStatusTransition } from "@/lib/execution/workflow";
import { calculateEngagements, calculateEngagementRate } from "@/lib/execution/kpi";
import type {
  Deliverable,
  DeliverableStatus,
  EvidenceType,
  MetricSource,
  StoryInstance,
  SubmissionApprovalStatus,
} from "@/types/database";

type Supabase = Awaited<ReturnType<typeof createClient>>;

function revalidateExecutionPaths(campaignId?: string) {
  revalidatePath("/content");
  if (campaignId) {
    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath(`/campaigns/${campaignId}/content`);
  }
}

// --- Workflow status ------------------------------------------------------

export async function updateDeliverableStatus(
  deliverableId: string,
  newStatus: DeliverableStatus,
  options?: { override?: boolean }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: deliverable } = await supabase.from("deliverables").select("*").eq("id", deliverableId).maybeSingle();
  if (!deliverable) return { error: "Deliverable not found." };

  const check = checkStatusTransition(deliverable.status, newStatus, options);
  if (!check.valid) return { error: check.reason };

  const patch: Record<string, unknown> = { status: newStatus };
  if (newStatus === "published" && !deliverable.published_at) {
    patch.published_at = new Date().toISOString();
  }

  await supabase.from("deliverables").update(patch as Partial<Deliverable>).eq("id", deliverableId);
  await logAudit(supabase, "deliverable_status_changed", "deliverables", deliverableId, { status: deliverable.status }, {
    status: newStatus,
    overridden: check.overridden ?? false,
  });

  revalidateExecutionPaths(deliverable.campaign_id);
  return {};
}

export async function updateStoryInstanceStatus(
  storyInstanceId: string,
  newStatus: DeliverableStatus,
  options?: { override?: boolean }
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: instance } = await supabase.from("story_instances").select("*").eq("id", storyInstanceId).maybeSingle();
  if (!instance) return { error: "Story instance not found." };

  const check = checkStatusTransition(instance.status, newStatus, options);
  if (!check.valid) return { error: check.reason };

  const patch: Record<string, unknown> = { status: newStatus };
  if (newStatus === "published" && !instance.published_at) patch.published_at = new Date().toISOString();

  await supabase.from("story_instances").update(patch as Partial<StoryInstance>).eq("id", storyInstanceId);
  await logAudit(supabase, "deliverable_status_changed", "story_instances", storyInstanceId, { status: instance.status }, {
    status: newStatus,
    overridden: check.overridden ?? false,
  });

  revalidateExecutionPaths();
  return {};
}

// Bulk status update (spec section 37) — validated per-item, never a
// blanket apply: a deliverable whose current stage can't reach the target
// is skipped and reported, not silently forced.
export async function bulkUpdateDeliverableStatus(
  deliverableIds: string[],
  newStatus: DeliverableStatus
): Promise<{ updated: number; skipped: { id: string; reason: string }[] }> {
  const supabase = await createClient();
  const { data: deliverables } = await supabase
    .from("deliverables")
    .select("id, status, campaign_id")
    .in("id", deliverableIds);

  const skipped: { id: string; reason: string }[] = [];
  let updated = 0;
  let campaignId: string | undefined;

  for (const d of deliverables ?? []) {
    const check = checkStatusTransition(d.status, newStatus);
    if (!check.valid) {
      skipped.push({ id: d.id, reason: check.reason ?? "Invalid transition" });
      continue;
    }
    await supabase.from("deliverables").update({ status: newStatus }).eq("id", d.id);
    updated++;
    campaignId = d.campaign_id;
  }

  if (updated > 0) {
    await logAudit(supabase, "deliverable_bulk_status_changed", "deliverables", deliverableIds[0], null, {
      count: updated,
      status: newStatus,
    });
  }

  revalidateExecutionPaths(campaignId);
  return { updated, skipped };
}

// --- Content submission (draft/revision versioning, spec section 19) -----

export interface SubmitContentInput {
  deliverableId: string;
  storyInstanceId?: string;
  contentUrl?: string;
  fileUrl?: string;
  storagePath?: string;
  caption?: string;
  thumbnailUrl?: string;
  notes?: string;
}

export async function submitContent(input: SubmitContentInput): Promise<{ error: string } | { submissionId: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: deliverable } = await supabase.from("deliverables").select("*").eq("id", input.deliverableId).maybeSingle();
  if (!deliverable) return { error: "Deliverable not found." };

  const { data: existingVersions } = await supabase
    .from("content_submissions")
    .select("version_number")
    .eq("deliverable_id", input.deliverableId)
    .order("version_number", { ascending: false })
    .limit(1);
  const nextVersion = (existingVersions?.[0]?.version_number ?? 0) + 1;

  const { data: submission, error } = await supabase
    .from("content_submissions")
    .insert({
      deliverable_id: input.deliverableId,
      story_instance_id: input.storyInstanceId ?? null,
      version_number: nextVersion,
      content_url: input.contentUrl ?? null,
      file_url: input.fileUrl ?? null,
      storage_path: input.storagePath ?? null,
      caption: input.caption ?? null,
      thumbnail_url: input.thumbnailUrl ?? null,
      notes: input.notes ?? null,
      submitted_by: userData.user?.id ?? null,
    })
    .select()
    .single();
  if (error || !submission) return { error: "Could not save the submission." };

  const check = checkStatusTransition(deliverable.status, "submitted");
  if (check.valid) {
    await supabase.from("deliverables").update({ status: "submitted" }).eq("id", input.deliverableId);
  }

  await logAudit(supabase, "content_submitted", "deliverables", input.deliverableId, null, { version: nextVersion });
  revalidateExecutionPaths(deliverable.campaign_id);
  return { submissionId: submission.id };
}

// A review decision is an explicit, authoritative action — it's allowed to
// move the deliverable regardless of exactly which pre-approval stage it
// was sitting in (spec section 17 permits an "explicit override"; a
// manager's review decision is exactly that kind of explicit action).
export async function reviewContentSubmission(
  submissionId: string,
  decision: SubmissionApprovalStatus,
  notes?: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: submission } = await supabase.from("content_submissions").select("*").eq("id", submissionId).maybeSingle();
  if (!submission) return { error: "Submission not found." };

  await supabase
    .from("content_submissions")
    .update({
      approval_status: decision,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userData.user?.id ?? null,
    })
    .eq("id", submissionId);

  const { data: deliverable } = await supabase
    .from("deliverables")
    .select("*")
    .eq("id", submission.deliverable_id)
    .maybeSingle();

  if (deliverable) {
    const targetStatus: DeliverableStatus | null =
      decision === "approved" ? "approved" : decision === "revision_requested" ? "needs_revision" : null;
    if (targetStatus) {
      await supabase.from("deliverables").update({ status: targetStatus }).eq("id", deliverable.id);
    }
  }

  const action =
    decision === "approved" ? "content_approved" : decision === "revision_requested" ? "revision_requested" : "content_rejected";
  await logAudit(supabase, action, "content_submissions", submissionId, null, { notes: notes ?? null });

  revalidateExecutionPaths(deliverable?.campaign_id);
  return {};
}

// --- Publication -----------------------------------------------------------

export interface PublishDeliverableInput {
  postUrl: string;
  platformPostId?: string;
  thumbnailUrl?: string;
  caption?: string;
  publishedAt?: string;
  socialAccountId?: string;
}

export async function publishDeliverable(
  deliverableId: string,
  input: PublishDeliverableInput
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: deliverable } = await supabase.from("deliverables").select("*").eq("id", deliverableId).maybeSingle();
  if (!deliverable) return { error: "Deliverable not found." };

  const check = checkStatusTransition(deliverable.status, "published");
  if (!check.valid) return { error: check.reason };

  const publishedAt = input.publishedAt ?? new Date().toISOString();

  const { error } = await supabase.from("content_posts").insert({
    campaign_id: deliverable.campaign_id,
    creator_id: deliverable.creator_id,
    campaign_creator_id: deliverable.campaign_creator_id,
    deliverable_id: deliverableId,
    social_account_id: input.socialAccountId ?? null,
    platform: deliverable.platform,
    content_type: deliverable.content_type,
    post_url: input.postUrl,
    platform_post_id: input.platformPostId ?? null,
    thumbnail_url: input.thumbnailUrl ?? null,
    caption: input.caption ?? null,
    published_at: publishedAt,
    collection_method: "manual",
  });
  if (error) {
    return { error: error.code === "23505" ? "This URL is already tracked for another post." : "Could not save the post." };
  }

  await supabase
    .from("deliverables")
    .update({ status: "published", published_at: publishedAt, published_url: input.postUrl })
    .eq("id", deliverableId);
  await logAudit(supabase, "content_published", "deliverables", deliverableId, null, { post_url: input.postUrl });

  revalidateExecutionPaths(deliverable.campaign_id);
  return {};
}

export interface PublishStoryInstanceInput {
  contentUrl?: string;
  caption?: string;
  publishedAt?: string;
}

export async function publishStoryInstance(
  storyInstanceId: string,
  input: PublishStoryInstanceInput
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: instance } = await supabase.from("story_instances").select("*").eq("id", storyInstanceId).maybeSingle();
  if (!instance) return { error: "Story instance not found." };

  const check = checkStatusTransition(instance.status, "published");
  if (!check.valid) return { error: check.reason };

  await supabase
    .from("story_instances")
    .update({
      status: "published",
      published_at: input.publishedAt ?? new Date().toISOString(),
      content_url: input.contentUrl ?? null,
      caption: input.caption ?? null,
    })
    .eq("id", storyInstanceId);
  await logAudit(supabase, "content_published", "story_instances", storyInstanceId, null, {});

  revalidateExecutionPaths();
  return {};
}

// --- Evidence (spec section 14-15) ----------------------------------------
//
// This only persists evidence *metadata* — an uploaded file/screenshot is
// pushed to Supabase Storage client-side first (same pattern as the
// existing creator-avatar upload), and its storage_path/file_url is
// passed in here. Google Drive fields are stored as given; no live Drive
// authentication happens in this phase (spec section 15: "without
// pretending that live Drive authentication exists" — see
// lib/integrations/google-drive/adapter.ts).

export interface AddEvidenceInput {
  deliverableId?: string;
  contentPostId?: string;
  storyInstanceId?: string;
  evidenceType: EvidenceType;
  fileUrl?: string;
  storagePath?: string;
  screenshotUrl?: string;
  driveFileId?: string;
  driveFolderId?: string;
  driveUrl?: string;
  filename?: string;
  notes?: string;
}

export async function addEvidence(input: AddEvidenceInput): Promise<{ error: string } | { evidenceId: string }> {
  if (!input.deliverableId && !input.contentPostId && !input.storyInstanceId) {
    return { error: "Evidence needs at least one parent (deliverable, content post, or Story instance)." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("content_evidence")
    .insert({
      deliverable_id: input.deliverableId ?? null,
      content_post_id: input.contentPostId ?? null,
      story_instance_id: input.storyInstanceId ?? null,
      evidence_type: input.evidenceType,
      file_url: input.fileUrl ?? null,
      storage_path: input.storagePath ?? null,
      screenshot_url: input.screenshotUrl ?? null,
      drive_file_id: input.driveFileId ?? null,
      drive_folder_id: input.driveFolderId ?? null,
      drive_url: input.driveUrl ?? null,
      filename: input.filename ?? null,
      captured_at: new Date().toISOString(),
      uploaded_by: userData.user?.id ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();
  if (error || !data) return { error: "Could not save the evidence." };

  const action = input.storyInstanceId ? "story_screenshot_uploaded" : "evidence_uploaded";
  await logAudit(supabase, action, "content_evidence", data.id, null, { evidence_type: input.evidenceType });

  revalidateExecutionPaths();
  return { evidenceId: data.id };
}

// --- Manual metric entry (spec sections 10, 31-32) ------------------------
//
// Every call inserts a brand-new snapshot row — metrics are never
// overwritten (spec section 10). engagements/engagement_rate are always
// computed here from the raw components, so a hand-entered snapshot is
// held to the same math as an aggregated one.

export interface MetricSnapshotInput {
  contentPostId?: string;
  storyInstanceId?: string;
  deliverableId?: string;
  views?: number | null;
  reach?: number | null;
  impressions?: number | null;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  reposts?: number | null;
  saves?: number | null;
  clicks?: number | null;
  replies?: number | null;
  linkClicks?: number | null;
  websiteClicks?: number | null;
  ctaClicks?: number | null;
  stickerTaps?: number | null;
  forwardTaps?: number | null;
  backTaps?: number | null;
  exits?: number | null;
  videoStarts?: number | null;
  threeSecondViews?: number | null;
  watchTime?: number | null;
  averageWatchTime?: number | null;
  completionRate?: number | null;
  // Only used to compute engagement rate by followers — never stored as
  // its own metric column.
  followers?: number | null;
  source: MetricSource;
  isEstimated?: boolean;
  capturedAt?: string;
}

export async function addMetricSnapshot(input: MetricSnapshotInput): Promise<{ error: string } | { metricId: string }> {
  const parentCount = [input.contentPostId, input.storyInstanceId, input.deliverableId].filter(Boolean).length;
  if (parentCount !== 1) {
    return { error: "Metrics must belong to exactly one parent (content post, Story instance, or deliverable)." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const engagements = calculateEngagements({
    likes: input.likes,
    comments: input.comments,
    shares: input.shares,
    saves: input.saves,
    reposts: input.reposts,
  });
  const { rate, method } = calculateEngagementRate(engagements, {
    reach: input.reach,
    impressions: input.impressions,
    followers: input.followers,
  });

  const { data, error } = await supabase
    .from("content_metrics")
    .insert({
      content_id: input.contentPostId ?? null,
      story_instance_id: input.storyInstanceId ?? null,
      deliverable_id: input.deliverableId ?? null,
      captured_at: input.capturedAt ?? new Date().toISOString(),
      source: input.source,
      views: input.views ?? null,
      reach: input.reach ?? null,
      impressions: input.impressions ?? null,
      likes: input.likes ?? null,
      comments: input.comments ?? null,
      shares: input.shares ?? null,
      reposts: input.reposts ?? null,
      saves: input.saves ?? null,
      clicks: input.clicks ?? null,
      replies: input.replies ?? null,
      engagements,
      engagement_rate: rate,
      engagement_rate_method: method,
      link_clicks: input.linkClicks ?? null,
      website_clicks: input.websiteClicks ?? null,
      cta_clicks: input.ctaClicks ?? null,
      sticker_taps: input.stickerTaps ?? null,
      forward_taps: input.forwardTaps ?? null,
      back_taps: input.backTaps ?? null,
      exits: input.exits ?? null,
      video_starts: input.videoStarts ?? null,
      three_second_views: input.threeSecondViews ?? null,
      watch_time: input.watchTime ?? null,
      average_watch_time: input.averageWatchTime ?? null,
      completion_rate: input.completionRate ?? null,
      is_estimated: input.isEstimated ?? false,
      captured_by: userData.user?.id ?? null,
    })
    .select()
    .single();
  if (error || !data) return { error: "Could not save the metrics." };

  // Only auto-advance to "metrics_collected" for the simple case where
  // this snapshot IS the whole deliverable's metrics (no content post or
  // Story instances involved) — a multi-instance Story deliverable needs
  // every instance measured first, which this single call can't confirm.
  if (input.deliverableId) {
    const { data: deliverable } = await supabase.from("deliverables").select("status").eq("id", input.deliverableId).maybeSingle();
    if (deliverable?.status === "published") {
      await supabase.from("deliverables").update({ status: "metrics_collected" }).eq("id", input.deliverableId);
    }
  }

  await logAudit(supabase, "metrics_added", "content_metrics", data.id, null, { source: input.source });
  revalidateExecutionPaths();
  return { metricId: data.id };
}

// --- Metric conflicts (spec sections 29-30) ---------------------------
//
// A conflict is never resolved by overwriting or deleting a snapshot —
// every capture stays exactly as it was. "Resolving" one only records
// which value the team currently trusts, via the audit log (reusing the
// existing infrastructure rather than adding a dedicated table for a
// decision that's really just an annotation on history everyone can
// still see in full).

export type MetricConflictResolution = "use_api" | "use_manual" | "keep_both" | "review_later";

export async function resolveMetricConflict(
  contentPostId: string,
  field: string,
  resolution: MetricConflictResolution,
  apiSnapshotId: string,
  manualSnapshotId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  await logAudit(supabase, "metric_conflict_resolved", "content_posts", contentPostId, null, {
    field,
    resolution,
    api_snapshot_id: apiSnapshotId,
    manual_snapshot_id: manualSnapshotId,
  });
  revalidateExecutionPaths();
  return {};
}

// --- Discovered content review (spec sections 14/15/43) --------------
//
// Backs both /content/matches (a discovered post with plausible
// candidates) and /content/import (one with none) — confirming always
// creates the content_posts row explicitly, by a human decision; nothing
// here auto-assigns.

export async function confirmContentMatch(discoveredContentId: string, deliverableId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: discovered } = await supabase.from("discovered_content").select("*").eq("id", discoveredContentId).maybeSingle();
  if (!discovered) return { error: "This discovered post no longer exists." };

  const { data: deliverable } = await supabase.from("deliverables").select("*").eq("id", deliverableId).maybeSingle();
  if (!deliverable) return { error: "Deliverable not found." };

  const { data: created, error } = await supabase
    .from("content_posts")
    .insert({
      campaign_id: deliverable.campaign_id,
      creator_id: deliverable.creator_id,
      deliverable_id: deliverableId,
      social_account_id: discovered.social_account_id,
      platform: discovered.platform,
      content_type: deliverable.content_type,
      post_url: discovered.post_url,
      platform_post_id: discovered.platform_post_id,
      published_at: discovered.published_at,
      collection_method: "api",
    })
    .select("id")
    .single();
  if (error || !created) {
    return { error: error?.code === "23505" ? "This URL or post id is already tracked." : "Could not create the content post." };
  }

  if (checkStatusTransition(deliverable.status, "published").valid) {
    await supabase
      .from("deliverables")
      .update({ status: "published", published_at: discovered.published_at, published_url: discovered.post_url })
      .eq("id", deliverableId);
  }

  await supabase
    .from("discovered_content")
    .update({ match_status: "confirmed", resolved_deliverable_id: deliverableId, resolved_at: new Date().toISOString() })
    .eq("id", discoveredContentId);
  await logAudit(supabase, "content_matched", "content_posts", created.id, null, { method: "manual_confirmation" });
  revalidatePath("/content/matches");
  revalidatePath("/content/import");
  revalidateExecutionPaths(deliverable.campaign_id);
  return {};
}

export async function ignoreDiscoveredContent(discoveredContentId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  await supabase.from("discovered_content").update({ match_status: "ignored", resolved_at: new Date().toISOString() }).eq("id", discoveredContentId);
  await logAudit(supabase, "content_unlinked", "discovered_content", discoveredContentId, null, { decision: "ignored" });
  revalidatePath("/content/matches");
  revalidatePath("/content/import");
  return {};
}
