// Generic synchronization service (spec section 16). Every sync run is
// recorded in integration_sync_logs (spec section 17), matches
// discovered content via lib/content-matching.ts (never auto-assigning
// an ambiguous match), and syncs metrics by inserting a brand-new
// content_metrics snapshot — never overwriting a previous one (spec
// section 18). Idempotent: re-running against the same content never
// creates a duplicate content_posts row (spec section 41).

import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { checkStatusTransition } from "@/lib/execution/workflow";
import { calculateEngagements, calculateEngagementRate } from "@/lib/execution/kpi";
import { getSocialPlatformAdapter } from "@/lib/integrations/registry";
import type { SocialPlatformAdapter, AdapterPost } from "@/lib/integrations/social-platform-adapter";
import { matchDiscoveredPost, type ExistingContentPostRef, type MatchCandidateDeliverable } from "@/lib/content-matching";
import type { SyncStatusValue } from "@/types/database";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface SyncOutcome {
  logId: string;
  provider: string;
  syncType: string;
  status: SyncStatusValue;
  recordsFound: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
  errorMessage?: string;
}

async function startLog(supabase: Supabase, provider: string, socialAccountId: string | null, syncType: string) {
  const { data, error } = await supabase
    .from("integration_sync_logs")
    .insert({ provider, social_account_id: socialAccountId, sync_type: syncType, status: "running" })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error(`Could not start a sync log (${provider}/${syncType}): ${error?.message ?? "no row returned"}`);
  }
  return data.id as string;
}

async function finishLog(
  supabase: Supabase,
  logId: string,
  fields: Omit<SyncOutcome, "logId" | "provider" | "syncType">
) {
  await supabase
    .from("integration_sync_logs")
    .update({
      completed_at: new Date().toISOString(),
      status: fields.status,
      records_found: fields.recordsFound,
      records_created: fields.recordsCreated,
      records_updated: fields.recordsUpdated,
      records_skipped: fields.recordsSkipped,
      records_failed: fields.recordsFailed,
      error_message: fields.errorMessage ?? null,
    })
    .eq("id", logId);
}

async function insertMetricSnapshot(
  supabase: Supabase,
  contentPostId: string,
  metrics: {
    capturedAt: string;
    views: number | null;
    reach: number | null;
    impressions: number | null;
    likes: number | null;
    comments: number | null;
    shares: number | null;
    saves: number | null;
  }
) {
  const engagements = calculateEngagements({ likes: metrics.likes, comments: metrics.comments, shares: metrics.shares, saves: metrics.saves });
  const { rate, method } = calculateEngagementRate(engagements, { reach: metrics.reach, impressions: metrics.impressions });
  await supabase.from("content_metrics").insert({
    content_id: contentPostId,
    captured_at: metrics.capturedAt,
    source: "api",
    views: metrics.views,
    reach: metrics.reach,
    impressions: metrics.impressions,
    likes: metrics.likes,
    comments: metrics.comments,
    shares: metrics.shares,
    saves: metrics.saves,
    engagements,
    engagement_rate: rate,
    engagement_rate_method: method,
    is_estimated: false,
  });
}

// Discovers + matches + creates content_posts, then syncs metrics for
// every content_post tied to this account (new and pre-existing alike).
// Pass `adapterOverride` to exercise this against a mock provider in
// tests without ever touching the real adapter registry.
export async function syncSocialAccount(
  socialAccountId: string,
  adapterOverride?: SocialPlatformAdapter,
  supabaseOverride?: Supabase
): Promise<SyncOutcome> {
  const supabase = supabaseOverride ?? (await createClient());
  const { data: account } = await supabase.from("social_accounts").select("*").eq("id", socialAccountId).maybeSingle();
  if (!account) {
    const logId = await startLog(supabase, "unknown", socialAccountId, "account");
    const outcome = { status: "failed" as SyncStatusValue, recordsFound: 0, recordsCreated: 0, recordsUpdated: 0, recordsSkipped: 0, recordsFailed: 1, errorMessage: "Social account not found." };
    await finishLog(supabase, logId, outcome);
    return { logId, provider: "unknown", syncType: "account", ...outcome };
  }

  const adapter = adapterOverride ?? getSocialPlatformAdapter(account.platform, socialAccountId);
  const logId = await startLog(supabase, account.platform, socialAccountId, "account");

  if (!adapter.isConfigured()) {
    const outcome = { status: "failed" as SyncStatusValue, recordsFound: 0, recordsCreated: 0, recordsUpdated: 0, recordsSkipped: 0, recordsFailed: 0, errorMessage: "Not configured — manual workflow applies." };
    await finishLog(supabase, logId, outcome);
    await supabase.from("social_accounts").update({ sync_status: "unsupported" }).eq("id", socialAccountId);
    return { logId, provider: account.platform, syncType: "account", ...outcome };
  }

  const postsResult = await adapter.getPosts();
  if (!postsResult.ok) {
    const outcome = { status: "failed" as SyncStatusValue, recordsFound: 0, recordsCreated: 0, recordsUpdated: 0, recordsSkipped: 0, recordsFailed: 1, errorMessage: postsResult.error };
    await finishLog(supabase, logId, outcome);
    await supabase.from("social_accounts").update({ sync_status: "error", sync_error: postsResult.error }).eq("id", socialAccountId);
    return { logId, provider: account.platform, syncType: "account", ...outcome };
  }

  const discoveredPosts = postsResult.data;

  const [{ data: existingForAccount }, { data: candidateDeliverables }] = await Promise.all([
    supabase.from("content_posts").select("id, platform_post_id, post_url, deliverable_id").eq("social_account_id", socialAccountId),
    supabase
      .from("deliverables")
      .select("id, campaign_id, creator_id, platform, content_type, due_date, status, campaigns(campaign_name, start_date, end_date)")
      .eq("creator_id", account.creator_id)
      .eq("platform", account.platform)
      .not("status", "in", "(cancelled)"),
  ]);

  const existingRefs: ExistingContentPostRef[] = (existingForAccount ?? []).map((cp) => ({
    id: cp.id,
    platformPostId: cp.platform_post_id,
    postUrl: cp.post_url,
    deliverableId: cp.deliverable_id,
  }));
  const trackedDeliverableIds = new Set(existingRefs.map((r) => r.deliverableId).filter(Boolean));

  const candidates: MatchCandidateDeliverable[] = (candidateDeliverables ?? []).map((d) => {
    const campaign = Array.isArray(d.campaigns) ? d.campaigns[0] : d.campaigns;
    return {
      deliverableId: d.id,
      campaignId: d.campaign_id,
      campaignName: campaign?.campaign_name ?? "Unknown campaign",
      creatorId: d.creator_id,
      platform: d.platform,
      contentType: d.content_type,
      dueDate: d.due_date,
      campaignStartDate: campaign?.start_date ?? null,
      campaignEndDate: campaign?.end_date ?? null,
      socialAccountId,
      alreadyHasContentPost: trackedDeliverableIds.has(d.id),
    };
  });

  let recordsCreated = 0;
  let recordsUpdated = 0;
  let recordsSkipped = 0;
  let recordsFailed = 0;
  const contentPostIdsToSyncMetrics: { id: string; platformPostId: string }[] = existingRefs
    .filter((r) => r.platformPostId)
    .map((r) => ({ id: r.id, platformPostId: r.platformPostId! }));

  for (const post of discoveredPosts) {
    const result = matchDiscoveredPost(
      { platformPostId: post.platformPostId, url: post.url, publishedAt: post.publishedAt, socialAccountId, creatorId: account.creator_id, platform: account.platform },
      existingRefs,
      candidates
    );

    if (result.status === "already_tracked") {
      recordsSkipped += 1;
      continue;
    }
    if (result.status === "ambiguous" || result.status === "unmatched") {
      // Left for /content/matches (candidates present) or /content/import
      // (none found) — never auto-assigned.
      await supabase
        .from("discovered_content")
        .upsert(
          {
            provider: account.platform,
            platform: account.platform,
            platform_post_id: post.platformPostId,
            post_url: post.url,
            published_at: post.publishedAt,
            social_account_id: socialAccountId,
            creator_id: account.creator_id,
            candidates: result.status === "ambiguous" ? result.candidates : [],
            match_status: "pending",
          },
          { onConflict: "provider,platform_post_id" }
        );
      recordsSkipped += 1;
      continue;
    }

    const deliverable = candidates.find((c) => c.deliverableId === result.deliverableId);
    const { data: created, error } = await supabase
      .from("content_posts")
      .insert({
        campaign_id: deliverable!.campaignId,
        creator_id: account.creator_id,
        deliverable_id: result.deliverableId,
        social_account_id: socialAccountId,
        platform: account.platform,
        content_type: deliverable!.contentType,
        post_url: post.url,
        platform_post_id: post.platformPostId,
        thumbnail_url: post.thumbnailUrl,
        caption: post.caption,
        published_at: post.publishedAt,
        collection_method: "api",
      })
      .select("id")
      .single();

    if (error || !created) {
      recordsFailed += 1;
      continue;
    }
    recordsCreated += 1;
    contentPostIdsToSyncMetrics.push({ id: created.id, platformPostId: post.platformPostId });

    // Confident match only — never changes status on an ambiguous one
    // (spec section 22).
    const { data: currentDeliverable } = await supabase.from("deliverables").select("status").eq("id", result.deliverableId).maybeSingle();
    if (currentDeliverable && checkStatusTransition(currentDeliverable.status, "published").valid) {
      await supabase.from("deliverables").update({ status: "published", published_at: post.publishedAt, published_url: post.url }).eq("id", result.deliverableId);
    }
    await logAudit(supabase, "content_matched", "content_posts", created.id, null, { method: result.method, confidence: result.confidence });
  }

  for (const { id, platformPostId } of contentPostIdsToSyncMetrics) {
    const metricsResult = await adapter.getPostMetrics(platformPostId);
    if (!metricsResult.ok) {
      recordsSkipped += 1;
      continue;
    }
    await insertMetricSnapshot(supabase, id, metricsResult.data);
    recordsUpdated += 1;
    await logAudit(supabase, "metrics_synced", "content_posts", id, null, { source: "api" });
  }

  const status: SyncStatusValue = recordsFailed > 0 ? "partial" : "completed";
  const outcome = { status, recordsFound: discoveredPosts.length, recordsCreated, recordsUpdated, recordsSkipped, recordsFailed };
  await finishLog(supabase, logId, outcome);
  await supabase.from("social_accounts").update({ last_synced_at: new Date().toISOString(), sync_status: "synced", sync_error: null }).eq("id", socialAccountId);

  return { logId, provider: account.platform, syncType: "account", ...outcome };
}

export async function syncContentMetrics(
  contentPostId: string,
  adapterOverride?: SocialPlatformAdapter,
  supabaseOverride?: Supabase
): Promise<SyncOutcome> {
  const supabase = supabaseOverride ?? (await createClient());
  const { data: post } = await supabase.from("content_posts").select("*").eq("id", contentPostId).maybeSingle();
  if (!post || !post.social_account_id || !post.platform_post_id) {
    const logId = await startLog(supabase, post?.platform ?? "unknown", post?.social_account_id ?? null, "metrics");
    const outcome = { status: "failed" as SyncStatusValue, recordsFound: 0, recordsCreated: 0, recordsUpdated: 0, recordsSkipped: 0, recordsFailed: 1, errorMessage: "Content post has no connected social account or platform post id." };
    await finishLog(supabase, logId, outcome);
    return { logId, provider: post?.platform ?? "unknown", syncType: "metrics", ...outcome };
  }

  const adapter = adapterOverride ?? getSocialPlatformAdapter(post.platform, post.social_account_id);
  const logId = await startLog(supabase, post.platform, post.social_account_id, "metrics");

  if (!adapter.isConfigured()) {
    const outcome = { status: "failed" as SyncStatusValue, recordsFound: 0, recordsCreated: 0, recordsUpdated: 0, recordsSkipped: 0, recordsFailed: 0, errorMessage: "Not configured — manual workflow applies." };
    await finishLog(supabase, logId, outcome);
    return { logId, provider: post.platform, syncType: "metrics", ...outcome };
  }

  const result = await adapter.getPostMetrics(post.platform_post_id);
  if (!result.ok) {
    const outcome = { status: "failed" as SyncStatusValue, recordsFound: 1, recordsCreated: 0, recordsUpdated: 0, recordsSkipped: 1, recordsFailed: 0, errorMessage: result.error };
    await finishLog(supabase, logId, outcome);
    return { logId, provider: post.platform, syncType: "metrics", ...outcome };
  }

  await insertMetricSnapshot(supabase, contentPostId, result.data);
  await logAudit(supabase, "metrics_synced", "content_posts", contentPostId, null, { source: "api" });
  const outcome = { status: "completed" as SyncStatusValue, recordsFound: 1, recordsCreated: 1, recordsUpdated: 0, recordsSkipped: 0, recordsFailed: 0 };
  await finishLog(supabase, logId, outcome);
  return { logId, provider: post.platform, syncType: "metrics", ...outcome };
}

export async function syncCreatorContent(creatorId: string, supabaseOverride?: Supabase): Promise<SyncOutcome[]> {
  const supabase = supabaseOverride ?? (await createClient());
  const { data: accounts } = await supabase.from("social_accounts").select("id").eq("creator_id", creatorId);
  const outcomes: SyncOutcome[] = [];
  for (const account of accounts ?? []) {
    outcomes.push(await syncSocialAccount(account.id, undefined, supabase));
  }
  return outcomes;
}

export async function syncCampaignContent(campaignId: string, supabaseOverride?: Supabase): Promise<SyncOutcome[]> {
  const supabase = supabaseOverride ?? (await createClient());
  const { data: campaignCreators } = await supabase.from("campaign_creators").select("creator_id").eq("campaign_id", campaignId);
  const creatorIds = [...new Set((campaignCreators ?? []).map((cc) => cc.creator_id))];
  if (creatorIds.length === 0) return [];

  const { data: accounts } = await supabase.from("social_accounts").select("id").in("creator_id", creatorIds);
  const outcomes: SyncOutcome[] = [];
  for (const account of accounts ?? []) {
    outcomes.push(await syncSocialAccount(account.id, undefined, supabase));
  }
  return outcomes;
}
