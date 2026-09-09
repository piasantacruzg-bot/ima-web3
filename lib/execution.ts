import { createClient } from "@/lib/supabase/server";
import type {
  Creator,
  Deliverable,
  StoryInstance,
  ContentPost,
  ContentEvidence,
  ContentMetrics,
  ContentSubmission,
  Campaign,
  SocialPlatform,
  DeliverableContentType,
  DeliverableStatus,
} from "@/types/database";
import { sumMetrics, averageEngagementRate, type AggregatedMetrics, type RawMetricSnapshot } from "@/lib/execution/aggregation";
import { computeDeliverableCompleteness, computeReportReadiness, type CompletenessState } from "@/lib/execution/completeness";

// A deliverable is a "Story" exactly when its content_type is
// instagram_story — the only format this schema tracks via per-instance
// story_instances rather than a single content_posts row.
export function isStoryDeliverable(d: Pick<Deliverable, "content_type">): boolean {
  return d.content_type === "instagram_story";
}

function metricToRaw(m: ContentMetrics | undefined | null): RawMetricSnapshot {
  if (!m) return {};
  return {
    views: m.views,
    reach: m.reach,
    impressions: m.impressions,
    likes: m.likes,
    comments: m.comments,
    shares: m.shares,
    reposts: m.reposts,
    saves: m.saves,
    clicks: m.clicks,
    replies: m.replies,
    engagements: m.engagements,
    link_clicks: m.link_clicks,
    website_clicks: m.website_clicks,
    cta_clicks: m.cta_clicks,
    sticker_taps: m.sticker_taps,
    forward_taps: m.forward_taps,
    back_taps: m.back_taps,
    exits: m.exits,
    video_starts: m.video_starts,
    three_second_views: m.three_second_views,
  };
}

function hasAnyMetric(raw: RawMetricSnapshot): boolean {
  return Object.values(raw).some((v) => v !== null && v !== undefined);
}

export interface StoryInstanceExecutionRow {
  instance: StoryInstance;
  latestMetrics: ContentMetrics | null;
  evidence: ContentEvidence[];
  completeness: CompletenessState;
}

export interface DeliverableExecutionRow {
  deliverable: Deliverable;
  creator: { id: string; display_name: string };
  campaign: { id: string; campaign_name: string };
  isStory: boolean;
  contentPost: ContentPost | null;
  storyInstances: StoryInstanceExecutionRow[];
  latestMetrics: ContentMetrics | null; // only set for non-story deliverables
  aggregatedMetrics: AggregatedMetrics;
  evidence: ContentEvidence[];
  hasUrl: boolean;
  hasEvidence: boolean;
  hasMetrics: boolean;
  completeness: CompletenessState;
}

async function fetchLatestMetricsByParent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  parentColumn: "content_id" | "story_instance_id" | "deliverable_id",
  ids: string[]
): Promise<Map<string, ContentMetrics>> {
  const map = new Map<string, ContentMetrics>();
  if (ids.length === 0) return map;
  const { data } = await supabase.from("content_metrics_latest").select("*").in(parentColumn, ids);
  for (const row of data ?? []) {
    const key = (row as unknown as Record<string, string>)[parentColumn];
    if (key) map.set(key, row as ContentMetrics);
  }
  return map;
}

// Fetches every deliverable, either for one campaign or across all of
// them, with its full execution picture: creator, Story instances (if
// applicable), content post, latest metrics, evidence, and completeness
// — everything the Content Tracker, deliverable detail pages, and
// campaign report need, built from individual deliverable-level data
// (spec section 1's non-negotiable hierarchy), never from a stored
// campaign/creator total.
async function getExecutionRows(filter: { campaignId?: string }): Promise<DeliverableExecutionRow[]> {
  const supabase = await createClient();

  let query = supabase.from("deliverables").select("*").order("due_date", { ascending: true, nullsFirst: false });
  if (filter.campaignId) query = query.eq("campaign_id", filter.campaignId);
  const { data: deliverables } = await query;

  const rows = deliverables ?? [];
  if (rows.length === 0) return [];

  const deliverableIds = rows.map((d) => d.id);
  const creatorIds = [...new Set(rows.map((d) => d.creator_id))];
  const campaignIds = [...new Set(rows.map((d) => d.campaign_id))];

  const [
    { data: creators },
    { data: campaigns },
    { data: storyInstances },
    { data: contentPosts },
    { data: evidenceRows },
  ] = await Promise.all([
    supabase.from("creators").select("id, display_name").in("id", creatorIds),
    supabase.from("campaigns").select("id, campaign_name").in("id", campaignIds),
    supabase.from("story_instances").select("*").in("deliverable_id", deliverableIds).order("sequence_number"),
    supabase.from("content_posts").select("*").in("deliverable_id", deliverableIds),
    supabase.from("content_evidence").select("*").in("deliverable_id", deliverableIds),
  ]);

  const creatorMap = new Map((creators ?? []).map((c) => [c.id, c]));
  const campaignMap = new Map((campaigns ?? []).map((c) => [c.id, c]));
  const storyInstancesByDeliverable = new Map<string, StoryInstance[]>();
  for (const si of storyInstances ?? []) {
    const list = storyInstancesByDeliverable.get(si.deliverable_id) ?? [];
    list.push(si);
    storyInstancesByDeliverable.set(si.deliverable_id, list);
  }
  const contentPostByDeliverable = new Map((contentPosts ?? []).map((cp) => [cp.deliverable_id as string, cp]));

  const storyInstanceIds = (storyInstances ?? []).map((si) => si.id);
  const contentPostIds = (contentPosts ?? []).map((cp) => cp.id);

  // Evidence can also be parented directly to a content_post or
  // story_instance rather than the deliverable — fetch those too.
  const [{ data: postEvidence }, { data: storyEvidence }] = await Promise.all([
    contentPostIds.length > 0
      ? supabase.from("content_evidence").select("*").in("content_post_id", contentPostIds)
      : Promise.resolve({ data: [] as ContentEvidence[] }),
    storyInstanceIds.length > 0
      ? supabase.from("content_evidence").select("*").in("story_instance_id", storyInstanceIds)
      : Promise.resolve({ data: [] as ContentEvidence[] }),
  ]);

  const allEvidence = [...(evidenceRows ?? []), ...(postEvidence ?? []), ...(storyEvidence ?? [])];
  const evidenceByDeliverable = new Map<string, ContentEvidence[]>();
  const evidenceByContentPost = new Map<string, ContentEvidence[]>();
  const evidenceByStoryInstance = new Map<string, ContentEvidence[]>();
  const seenEvidenceIds = new Set<string>();
  for (const ev of allEvidence) {
    if (seenEvidenceIds.has(ev.id)) continue;
    seenEvidenceIds.add(ev.id);
    if (ev.deliverable_id) {
      const list = evidenceByDeliverable.get(ev.deliverable_id) ?? [];
      list.push(ev);
      evidenceByDeliverable.set(ev.deliverable_id, list);
    }
    if (ev.content_post_id) {
      const list = evidenceByContentPost.get(ev.content_post_id) ?? [];
      list.push(ev);
      evidenceByContentPost.set(ev.content_post_id, list);
    }
    if (ev.story_instance_id) {
      const list = evidenceByStoryInstance.get(ev.story_instance_id) ?? [];
      list.push(ev);
      evidenceByStoryInstance.set(ev.story_instance_id, list);
    }
  }

  const [metricsByContentPost, metricsByStoryInstance, metricsByDeliverable] = await Promise.all([
    fetchLatestMetricsByParent(supabase, "content_id", contentPostIds),
    fetchLatestMetricsByParent(supabase, "story_instance_id", storyInstanceIds),
    fetchLatestMetricsByParent(supabase, "deliverable_id", deliverableIds),
  ]);

  return rows.map((deliverable) => {
    const creator = creatorMap.get(deliverable.creator_id) ?? { id: deliverable.creator_id, display_name: "Unknown creator" };
    const campaign = campaignMap.get(deliverable.campaign_id) ?? { id: deliverable.campaign_id, campaign_name: "Unknown campaign" };
    const story = isStoryDeliverable(deliverable);
    const instances = storyInstancesByDeliverable.get(deliverable.id) ?? [];
    const contentPost = contentPostByDeliverable.get(deliverable.id) ?? null;

    if (story) {
      const instanceRows: StoryInstanceExecutionRow[] = instances.map((instance) => {
        const latest = metricsByStoryInstance.get(instance.id) ?? null;
        const evidence = evidenceByStoryInstance.get(instance.id) ?? [];
        const completeness = computeDeliverableCompleteness({
          isStory: true,
          isPublished: instance.status === "published" || instance.published_at !== null,
          hasEvidence: evidence.length > 0,
          hasUrl: Boolean(instance.content_url),
          hasMetrics: hasAnyMetric(metricToRaw(latest)),
        });
        return { instance, latestMetrics: latest, evidence, completeness };
      });

      const aggregated = sumMetrics(instanceRows.map((r) => metricToRaw(r.latestMetrics)));
      const evidence = [
        ...(evidenceByDeliverable.get(deliverable.id) ?? []),
        ...instanceRows.flatMap((r) => r.evidence),
      ];
      const hasMetrics = hasAnyMetric(aggregated as unknown as RawMetricSnapshot);
      const hasEvidence = evidence.length > 0;

      return {
        deliverable,
        creator,
        campaign,
        isStory: true,
        contentPost: null,
        storyInstances: instanceRows,
        latestMetrics: null,
        aggregatedMetrics: aggregated,
        evidence,
        hasUrl: instanceRows.some((r) => Boolean(r.instance.content_url)),
        hasEvidence,
        hasMetrics,
        completeness: computeDeliverableCompleteness({
          isStory: true,
          isPublished: deliverable.status === "published" || deliverable.published_at !== null,
          hasEvidence,
          hasUrl: false,
          hasMetrics,
        }),
      };
    }

    const latest = contentPost ? metricsByContentPost.get(contentPost.id) ?? null : metricsByDeliverable.get(deliverable.id) ?? null;
    const raw = metricToRaw(latest);
    const aggregated = sumMetrics([raw]);
    const evidence = [
      ...(evidenceByDeliverable.get(deliverable.id) ?? []),
      ...(contentPost ? evidenceByContentPost.get(contentPost.id) ?? [] : []),
    ];
    const hasUrl = Boolean(contentPost?.post_url ?? deliverable.published_url);
    const hasMetrics = hasAnyMetric(raw);
    const hasEvidence = evidence.length > 0;

    return {
      deliverable,
      creator,
      campaign,
      isStory: false,
      contentPost,
      storyInstances: [],
      latestMetrics: latest,
      aggregatedMetrics: aggregated,
      evidence,
      hasUrl,
      hasEvidence,
      hasMetrics,
      completeness: computeDeliverableCompleteness({
        isStory: false,
        isPublished: deliverable.status === "published" || deliverable.published_at !== null,
        hasEvidence,
        hasUrl,
        hasMetrics,
      }),
    };
  });
}

export async function getCampaignExecutionRows(campaignId: string): Promise<DeliverableExecutionRow[]> {
  return getExecutionRows({ campaignId });
}

// Every deliverable across every campaign — backs the global /content
// Content Tracker. Same per-deliverable computation as the per-campaign
// version; nothing here is a separately stored global total.
export async function getAllExecutionRows(): Promise<DeliverableExecutionRow[]> {
  return getExecutionRows({});
}

// --- Aggregation wrappers -------------------------------------------------

export function getCreatorCampaignMetrics(rows: DeliverableExecutionRow[], creatorId: string): AggregatedMetrics {
  const creatorRows = rows.filter((r) => r.creator.id === creatorId);
  return sumMetrics(creatorRows.map((r) => r.aggregatedMetrics as unknown as RawMetricSnapshot));
}

export function getCampaignAggregateMetrics(rows: DeliverableExecutionRow[]): AggregatedMetrics {
  return sumMetrics(rows.map((r) => r.aggregatedMetrics as unknown as RawMetricSnapshot));
}

export interface CreatorPerformanceRow {
  creatorId: string;
  creatorName: string;
  deliverableCount: number;
  metrics: AggregatedMetrics;
}

// One row per creator active on the campaign, each total computed the
// same way as getCreatorCampaignMetrics — never a separately entered
// figure (spec sections 1 and 24). Shared by the dashboard and the report.
export function getCreatorPerformanceRows(rows: DeliverableExecutionRow[]): CreatorPerformanceRow[] {
  const creatorIds = [...new Set(rows.map((r) => r.creator.id))];
  return creatorIds.map((creatorId) => {
    const creatorRows = rows.filter((r) => r.creator.id === creatorId);
    return {
      creatorId,
      creatorName: creatorRows[0]?.creator.display_name ?? "Unknown creator",
      deliverableCount: creatorRows.length,
      metrics: getCreatorCampaignMetrics(rows, creatorId),
    };
  });
}

export { averageEngagementRate };

// --- Completeness / readiness roll-ups ------------------------------------

export function getCampaignReadiness(rows: DeliverableExecutionRow[]) {
  const totalDeliverables = rows.length;
  const publishedDeliverables = rows.filter(
    (r) => r.deliverable.status === "published" || r.deliverable.published_at !== null
  ).length;
  const deliverablesWithMetrics = rows.filter((r) => r.hasMetrics).length;
  const deliverablesWithEvidence = rows.filter((r) => r.hasEvidence).length;
  const deliverablesMissingUrl = rows.filter((r) => !r.isStory && !r.hasUrl && r.deliverable.status === "published").length;
  const storiesMissingScreenshots = rows
    .filter((r) => r.isStory)
    .flatMap((r) => r.storyInstances)
    .filter((si) => (si.instance.status === "published" || si.instance.published_at) && !si.evidence.length).length;

  return computeReportReadiness({
    totalDeliverables,
    publishedDeliverables,
    deliverablesWithMetrics,
    deliverablesWithEvidence,
    storiesMissingScreenshots,
    deliverablesMissingUrl,
  });
}

// --- Single deliverable detail (with full metric history) ----------------

export interface DeliverableDetail {
  deliverable: Deliverable;
  creator: Creator;
  campaign: Pick<Campaign, "id" | "campaign_name">;
  execution: DeliverableExecutionRow;
  metricHistory: ContentMetrics[]; // every snapshot, oldest first — never just the latest
  submissions: ContentSubmission[]; // every version, oldest first — never destroyed
}

export async function getDeliverableDetail(deliverableId: string): Promise<DeliverableDetail | null> {
  const supabase = await createClient();
  const { data: deliverable } = await supabase.from("deliverables").select("*").eq("id", deliverableId).maybeSingle();
  if (!deliverable) return null;

  const [{ data: creator }, { data: campaign }, executionRows] = await Promise.all([
    supabase.from("creators").select("*").eq("id", deliverable.creator_id).maybeSingle(),
    supabase.from("campaigns").select("id, campaign_name").eq("id", deliverable.campaign_id).maybeSingle(),
    getCampaignExecutionRows(deliverable.campaign_id),
  ]);
  if (!creator || !campaign) return null;

  const execution = executionRows.find((r) => r.deliverable.id === deliverableId);
  if (!execution) return null;

  let metricHistory: ContentMetrics[] = [];
  if (execution.isStory) {
    const instanceIds = execution.storyInstances.map((r) => r.instance.id);
    if (instanceIds.length > 0) {
      const { data } = await supabase
        .from("content_metrics")
        .select("*")
        .in("story_instance_id", instanceIds)
        .order("captured_at", { ascending: true });
      metricHistory = data ?? [];
    }
  } else if (execution.contentPost) {
    const { data } = await supabase
      .from("content_metrics")
      .select("*")
      .eq("content_id", execution.contentPost.id)
      .order("captured_at", { ascending: true });
    metricHistory = data ?? [];
  } else {
    const { data } = await supabase
      .from("content_metrics")
      .select("*")
      .eq("deliverable_id", deliverableId)
      .order("captured_at", { ascending: true });
    metricHistory = data ?? [];
  }

  const { data: submissionRows } = await supabase
    .from("content_submissions")
    .select("*")
    .eq("deliverable_id", deliverableId)
    .order("version_number", { ascending: true });

  return { deliverable, creator, campaign, execution, metricHistory, submissions: submissionRows ?? [] };
}

// --- Content Tracker rows --------------------------------------------------
//
// Flattens execution rows into one row per independently-trackable unit:
// a Story deliverable with N instances becomes N rows here, each carrying
// its own metrics/evidence/completeness (spec section 5's non-negotiable
// rule) — never one shared row standing in for the whole batch. A pure
// function over already-fetched rows, so it is unit-testable without a
// database and reusable by both the Content Tracker UI and the CSV/XLSX
// export.
export interface TrackerItem {
  key: string;
  deliverableId: string;
  campaignId: string;
  campaignName: string;
  creatorId: string;
  creatorName: string;
  platform: SocialPlatform;
  contentType: DeliverableContentType;
  isStory: boolean;
  sequenceNumber: number | null;
  title: string | null;
  status: DeliverableStatus;
  dueDate: string | null;
  publishedAt: string | null;
  contentUrl: string | null;
  hasEvidence: boolean;
  hasMetrics: boolean;
  hasUrl: boolean;
  completeness: CompletenessState;
  needsReview: boolean;
  metrics: AggregatedMetrics;
}

function needsReviewStatus(status: DeliverableStatus): boolean {
  return status === "submitted" || status === "in_review";
}

export function getTrackerItems(rows: DeliverableExecutionRow[]): TrackerItem[] {
  const items: TrackerItem[] = [];

  for (const row of rows) {
    if (row.isStory && row.storyInstances.length > 0) {
      for (const si of row.storyInstances) {
        items.push({
          key: `${row.deliverable.id}:${si.instance.sequence_number}`,
          deliverableId: row.deliverable.id,
          campaignId: row.campaign.id,
          campaignName: row.campaign.campaign_name,
          creatorId: row.creator.id,
          creatorName: row.creator.display_name,
          platform: row.deliverable.platform,
          contentType: row.deliverable.content_type,
          isStory: true,
          sequenceNumber: si.instance.sequence_number,
          title: row.deliverable.title,
          status: si.instance.status,
          dueDate: row.deliverable.due_date,
          publishedAt: si.instance.published_at,
          contentUrl: si.instance.content_url,
          hasEvidence: si.evidence.length > 0,
          hasMetrics: hasAnyMetric(metricToRaw(si.latestMetrics)),
          hasUrl: Boolean(si.instance.content_url),
          completeness: si.completeness,
          needsReview: needsReviewStatus(si.instance.status),
          metrics: sumMetrics([metricToRaw(si.latestMetrics)]),
        });
      }
      continue;
    }

    items.push({
      key: row.deliverable.id,
      deliverableId: row.deliverable.id,
      campaignId: row.campaign.id,
      campaignName: row.campaign.campaign_name,
      creatorId: row.creator.id,
      creatorName: row.creator.display_name,
      platform: row.deliverable.platform,
      contentType: row.deliverable.content_type,
      isStory: row.isStory,
      sequenceNumber: null,
      title: row.deliverable.title,
      status: row.deliverable.status,
      dueDate: row.deliverable.due_date,
      publishedAt: row.deliverable.published_at,
      contentUrl: row.contentPost?.post_url ?? row.deliverable.published_url ?? null,
      hasEvidence: row.hasEvidence,
      hasMetrics: row.hasMetrics,
      hasUrl: row.hasUrl,
      completeness: row.completeness,
      needsReview: needsReviewStatus(row.deliverable.status),
      metrics: row.aggregatedMetrics,
    });
  }

  return items;
}

// --- Evidence review (/evidence) -------------------------------------

export interface EvidenceReviewItem {
  key: string;
  campaignId: string;
  campaignName: string;
  creatorId: string;
  creatorName: string;
  deliverableId: string;
  isStory: boolean;
  sequenceNumber: number | null;
  title: string | null;
  contentType: DeliverableContentType;
  evidence: ContentEvidence[];
  hasEvidence: boolean;
  hasDriveEvidence: boolean;
  hasInternalEvidence: boolean;
  thumbnailUrl: string | null;
}

function summarizeEvidence(evidence: ContentEvidence[]): Pick<EvidenceReviewItem, "hasDriveEvidence" | "hasInternalEvidence" | "thumbnailUrl"> {
  return {
    hasDriveEvidence: evidence.some((e) => e.evidence_type === "google_drive" || Boolean(e.drive_url)),
    hasInternalEvidence: evidence.some((e) => Boolean(e.storage_path)),
    thumbnailUrl: evidence.find((e) => e.screenshot_url)?.screenshot_url ?? null,
  };
}

export function getEvidenceReviewItems(rows: DeliverableExecutionRow[]): EvidenceReviewItem[] {
  const items: EvidenceReviewItem[] = [];

  for (const row of rows) {
    if (row.isStory && row.storyInstances.length > 0) {
      for (const si of row.storyInstances) {
        items.push({
          key: `${row.deliverable.id}:${si.instance.sequence_number}`,
          campaignId: row.campaign.id,
          campaignName: row.campaign.campaign_name,
          creatorId: row.creator.id,
          creatorName: row.creator.display_name,
          deliverableId: row.deliverable.id,
          isStory: true,
          sequenceNumber: si.instance.sequence_number,
          title: row.deliverable.title,
          contentType: row.deliverable.content_type,
          evidence: si.evidence,
          hasEvidence: si.evidence.length > 0,
          ...summarizeEvidence(si.evidence),
        });
      }
      continue;
    }

    items.push({
      key: row.deliverable.id,
      campaignId: row.campaign.id,
      campaignName: row.campaign.campaign_name,
      creatorId: row.creator.id,
      creatorName: row.creator.display_name,
      deliverableId: row.deliverable.id,
      isStory: row.isStory,
      sequenceNumber: null,
      title: row.deliverable.title,
      contentType: row.deliverable.content_type,
      evidence: row.evidence,
      hasEvidence: row.hasEvidence,
      ...summarizeEvidence(row.evidence),
    });
  }

  return items;
}
