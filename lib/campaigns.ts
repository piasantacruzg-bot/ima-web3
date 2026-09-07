import { createClient } from "@/lib/supabase/server";
import type {
  Campaign,
  CampaignCreator,
  CampaignStatus,
  Creator,
  CreatorStatus,
  Deliverable,
  SocialPlatform,
} from "@/types/database";
import { CAMPAIGN_SORT_OPTIONS, type CampaignSortKey } from "@/lib/campaign-sort-options";
import type { CreatorForMatching, CreatorHistoryForMatching } from "@/lib/campaigns/matching-service";
import { calculateCampaignBudget, type BudgetSummary } from "@/lib/campaigns/budget";

export { CAMPAIGN_SORT_OPTIONS, type CampaignSortKey };

export interface CampaignFilters {
  search?: string;
  status?: CampaignStatus;
  clientName?: string;
  includeArchived?: boolean;
}

const PAGE_SIZE = 25;

// Same "wrap in an object" workaround as lib/creators.ts: a postgrest-js
// query builder is thenable, so returning it bare from an async function
// would make JS's promise machinery execute it immediately.
async function applyCampaignFilters(
  query: any,
  filters: CampaignFilters
): Promise<{ query: any }> {
  if (!filters.includeArchived) {
    query = query.is("archived_at", null);
  }
  if (filters.search) {
    const term = filters.search.trim().replace(/[%,]/g, "");
    query = query.or(
      `campaign_name.ilike.%${term}%,client_name.ilike.%${term}%,brand_name.ilike.%${term}%`
    );
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.clientName) {
    query = query.eq("client_name", filters.clientName);
  }
  return { query };
}

export interface CampaignListRow extends Campaign {
  creator_count: number;
  selected_creator_count: number;
  deliverable_count: number;
}

export async function getCampaigns({
  filters = {},
  sort = "recently_added",
  page = 1,
}: {
  filters?: CampaignFilters;
  sort?: CampaignSortKey;
  page?: number;
}): Promise<{ campaigns: CampaignListRow[]; total: number; pageSize: number }> {
  const supabase = await createClient();
  let { query } = await applyCampaignFilters(
    supabase.from("campaigns").select("*", { count: "exact" }),
    filters
  );

  const sortOption = CAMPAIGN_SORT_OPTIONS[sort];
  query = query.order(sortOption.column, { ascending: sortOption.ascending });

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data: campaigns, count, error } = await query;
  if (error) throw error;

  const campaignIds = (campaigns ?? []).map((c: Campaign) => c.id);
  if (campaignIds.length === 0) {
    return { campaigns: [], total: count ?? 0, pageSize: PAGE_SIZE };
  }

  const [{ data: creatorRows }, { data: deliverableRows }] = await Promise.all([
    supabase.from("campaign_creators").select("campaign_id, selection_status").in("campaign_id", campaignIds),
    supabase.from("deliverables").select("campaign_id").in("campaign_id", campaignIds),
  ]);

  const creatorCounts = new Map<string, number>();
  const selectedCounts = new Map<string, number>();
  for (const row of creatorRows ?? []) {
    creatorCounts.set(row.campaign_id, (creatorCounts.get(row.campaign_id) ?? 0) + 1);
    if (row.selection_status === "selected") {
      selectedCounts.set(row.campaign_id, (selectedCounts.get(row.campaign_id) ?? 0) + 1);
    }
  }
  const deliverableCounts = new Map<string, number>();
  for (const row of deliverableRows ?? []) {
    deliverableCounts.set(row.campaign_id, (deliverableCounts.get(row.campaign_id) ?? 0) + 1);
  }

  const enriched: CampaignListRow[] = (campaigns ?? []).map((c: Campaign) => ({
    ...c,
    creator_count: creatorCounts.get(c.id) ?? 0,
    selected_creator_count: selectedCounts.get(c.id) ?? 0,
    deliverable_count: deliverableCounts.get(c.id) ?? 0,
  }));

  return { campaigns: enriched, total: count ?? 0, pageSize: PAGE_SIZE };
}

// --- Social stats without inventing data ---------------------------------
//
// The `creators_with_stats` view (built for the Creators list/table)
// coalesces missing follower/engagement/view figures to 0 — reasonable for
// a table column, but wrong for matching: a creator with no recorded
// followers is *unknown*, not "0 followers" (spec section 40 / section 13:
// never display/treat a missing metric as zero). This queries
// social_accounts directly so a creator with no accounts, or accounts with
// unset fields, comes back as `null`, not 0.

export interface CreatorSocialStats {
  followers: number | null;
  engagementRate: number | null;
  averageViews: number | null;
  platforms: SocialPlatform[];
}

export async function getSocialStatsForCreators(
  supabase: Awaited<ReturnType<typeof createClient>>,
  creatorIds: string[]
): Promise<Map<string, CreatorSocialStats>> {
  const stats = new Map<string, CreatorSocialStats>();
  if (creatorIds.length === 0) return stats;

  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("creator_id, platform, followers, engagement_rate, average_views")
    .in("creator_id", creatorIds);

  const byCreator = new Map<string, typeof accounts>();
  for (const account of accounts ?? []) {
    const list = byCreator.get(account.creator_id) ?? [];
    list.push(account);
    byCreator.set(account.creator_id, list as NonNullable<typeof accounts>);
  }

  for (const creatorId of creatorIds) {
    const rows = byCreator.get(creatorId) ?? [];
    const followerValues = rows.map((r) => r.followers).filter((v): v is number => v !== null);
    const engagementValues = rows.map((r) => r.engagement_rate).filter((v): v is number => v !== null);
    const viewsValues = rows.map((r) => r.average_views).filter((v): v is number => v !== null);

    stats.set(creatorId, {
      followers: followerValues.length > 0 ? Math.max(...followerValues) : null,
      engagementRate:
        engagementValues.length > 0
          ? Math.round((engagementValues.reduce((a, b) => a + b, 0) / engagementValues.length) * 100) / 100
          : null,
      averageViews: viewsValues.length > 0 ? Math.max(...viewsValues) : null,
      platforms: [...new Set(rows.map((r) => r.platform))],
    });
  }

  return stats;
}

export function creatorToMatchingInput(creator: Creator, stats: CreatorSocialStats): CreatorForMatching {
  return {
    id: creator.id,
    displayName: creator.display_name,
    status: creator.status,
    creatorType: creator.creator_type,
    categories: creator.categories,
    country: creator.country,
    city: creator.city,
    brandFitScore: creator.brand_fit_score,
    internalRating: creator.internal_rating,
    platforms: stats.platforms,
    followers: stats.followers,
    engagementRate: stats.engagementRate,
    averageViews: stats.averageViews,
  };
}

// --- Candidate pool for matching (spec section 41: filter first, score
// only what's left) -------------------------------------------------------

export interface CandidatePoolOptions {
  platforms?: SocialPlatform[];
  categories?: string[];
  locations?: string[];
  allowedStatuses?: CreatorStatus[];
  excludedCreatorIds?: string[];
  excludedCategories?: string[];
  excludedLocations?: string[];
}

export async function getCandidateCreators(
  options: CandidatePoolOptions
): Promise<{ creator: Creator; stats: CreatorSocialStats }[]> {
  const supabase = await createClient();
  let query = supabase.from("creators").select("*").is("archived_at", null);

  const allowedStatuses = options.allowedStatuses ?? ["approved", "active"];
  query = query.in("status", allowedStatuses);

  if (options.categories && options.categories.length > 0) {
    query = query.overlaps("categories", options.categories);
  }
  if (options.excludedCreatorIds && options.excludedCreatorIds.length > 0) {
    query = query.not("id", "in", `(${options.excludedCreatorIds.join(",")})`);
  }

  const { data: creators, error } = await query;
  if (error) throw error;

  let pool = creators ?? [];

  // Location and category-exclusion filtering happens in JS: a creator's
  // location is city/country (two columns), and "excluded category" needs
  // an *exclude-if-any-overlap* semantic that postgrest's `.overlaps()`
  // can't express as a negation directly.
  if (options.locations && options.locations.length > 0) {
    const locations = options.locations.map((l) => l.toLowerCase());
    pool = pool.filter(
      (c) =>
        (c.city && locations.includes(c.city.toLowerCase())) ||
        (c.country && locations.includes(c.country.toLowerCase()))
    );
  }
  if (options.excludedCategories && options.excludedCategories.length > 0) {
    const excluded = new Set(options.excludedCategories.map((c) => c.toLowerCase()));
    pool = pool.filter((c) => !c.categories.some((cat) => excluded.has(cat.toLowerCase())));
  }
  if (options.excludedLocations && options.excludedLocations.length > 0) {
    const excluded = new Set(options.excludedLocations.map((l) => l.toLowerCase()));
    pool = pool.filter(
      (c) => !((c.city && excluded.has(c.city.toLowerCase())) || (c.country && excluded.has(c.country.toLowerCase())))
    );
  }

  const stats = await getSocialStatsForCreators(
    supabase,
    pool.map((c) => c.id)
  );

  // Platform filtering needs social account data, so it happens after the
  // stats fetch (still only over the already-narrowed pool, not the whole
  // creator table).
  let result = pool.map((creator) => ({ creator, stats: stats.get(creator.id)! }));
  if (options.platforms && options.platforms.length > 0) {
    result = result.filter((r) => r.stats.platforms.some((p) => options.platforms!.includes(p)));
  }

  return result;
}

// --- Historical performance & cost efficiency inputs ---------------------

export async function getCreatorHistoryMap(
  creatorIds: string[]
): Promise<Map<string, CreatorHistoryForMatching>> {
  const supabase = await createClient();
  const history = new Map<string, CreatorHistoryForMatching>();
  if (creatorIds.length === 0) return history;

  const [{ data: campaignCreatorRows }, { data: deliverableRows }] = await Promise.all([
    supabase
      .from("campaign_creators")
      .select("creator_id, negotiated_fee, approved_fee")
      .in("creator_id", creatorIds)
      .neq("status", "removed"),
    supabase.from("deliverables").select("creator_id, status").in("creator_id", creatorIds),
  ]);

  const byCreator = new Map<string, { fees: number[]; count: number }>();
  for (const row of campaignCreatorRows ?? []) {
    const entry = byCreator.get(row.creator_id) ?? { fees: [], count: 0 };
    entry.count++;
    const fee = row.approved_fee ?? row.negotiated_fee;
    if (fee !== null) entry.fees.push(fee);
    byCreator.set(row.creator_id, entry);
  }

  const deliverableCounts = new Map<string, { completed: number; total: number }>();
  for (const row of deliverableRows ?? []) {
    const entry = deliverableCounts.get(row.creator_id) ?? { completed: 0, total: 0 };
    entry.total++;
    if (row.status === "published") entry.completed++;
    deliverableCounts.set(row.creator_id, entry);
  }

  for (const creatorId of creatorIds) {
    const campaignEntry = byCreator.get(creatorId);
    const deliverableEntry = deliverableCounts.get(creatorId);
    history.set(creatorId, {
      previousCampaignCount: campaignEntry?.count ?? 0,
      completedDeliverables: deliverableEntry?.completed ?? 0,
      totalDeliverables: deliverableEntry?.total ?? 0,
      averagePastFee:
        campaignEntry && campaignEntry.fees.length > 0
          ? campaignEntry.fees.reduce((a, b) => a + b, 0) / campaignEntry.fees.length
          : null,
    });
  }

  return history;
}

// --- Campaign detail ------------------------------------------------------

export interface CampaignDetail {
  campaign: Campaign;
  creatorCounts: { total: number; shortlisted: number; selected: number; rejected: number };
  deliverableCounts: { total: number; completed: number; pending: number };
  budget: BudgetSummary;
  estimated: { followers: number | null; engagementRate: number | null; averageViews: number | null };
}

export async function getCampaignDetail(id: string): Promise<CampaignDetail | null> {
  const supabase = await createClient();
  const { data: campaign } = await supabase.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (!campaign) return null;

  const [{ data: campaignCreators }, { data: deliverables }] = await Promise.all([
    supabase.from("campaign_creators").select("*").eq("campaign_id", id),
    supabase.from("deliverables").select("status").eq("campaign_id", id),
  ]);

  const rows = campaignCreators ?? [];
  const creatorCounts = {
    total: rows.length,
    shortlisted: rows.filter((r) => r.selection_status === "shortlisted").length,
    selected: rows.filter((r) => r.selection_status === "selected").length,
    rejected: rows.filter((r) => r.selection_status === "rejected").length,
  };

  const deliverableRows = deliverables ?? [];
  const deliverableCounts = {
    total: deliverableRows.length,
    completed: deliverableRows.filter((d) => d.status === "published").length,
    pending: deliverableRows.filter((d) => !["published", "cancelled"].includes(d.status)).length,
  };

  const budget = calculateCampaignBudget(
    {
      budget: campaign.budget,
      creatorBudget: campaign.creator_budget,
      productionBudget: campaign.production_budget,
      paidMediaBudget: campaign.paid_media_budget,
      agencyFee: campaign.agency_fee,
      otherBudget: campaign.other_budget,
    },
    rows.map((r) => ({
      creatorId: r.creator_id,
      selectionStatus: r.selection_status,
      proposedFee: r.proposed_fee,
      negotiatedFee: r.negotiated_fee,
      approvedFee: r.approved_fee,
      currency: r.currency,
    }))
  );

  // "Estimated" campaign reach — clearly distinct from actual performance,
  // which doesn't exist yet (spec section 3: never present these as actual
  // campaign performance). Only computed from creators actually selected,
  // and only from real, non-null social stats.
  const selectedCreatorIds = rows.filter((r) => r.selection_status === "selected").map((r) => r.creator_id);
  const stats = await getSocialStatsForCreators(supabase, selectedCreatorIds);
  const followerValues = [...stats.values()].map((s) => s.followers).filter((v): v is number => v !== null);
  const engagementValues = [...stats.values()].map((s) => s.engagementRate).filter((v): v is number => v !== null);
  const viewsValues = [...stats.values()].map((s) => s.averageViews).filter((v): v is number => v !== null);

  return {
    campaign,
    creatorCounts,
    deliverableCounts,
    budget,
    estimated: {
      followers: followerValues.length > 0 ? followerValues.reduce((a, b) => a + b, 0) : null,
      engagementRate:
        engagementValues.length > 0
          ? Math.round((engagementValues.reduce((a, b) => a + b, 0) / engagementValues.length) * 100) / 100
          : null,
      averageViews:
        viewsValues.length > 0 ? Math.round(viewsValues.reduce((a, b) => a + b, 0) / viewsValues.length) : null,
    },
  };
}

// --- Campaign creators (selection workspace + detail) ---------------------

export interface CampaignCreatorRow {
  campaignCreator: CampaignCreator;
  creator: Creator;
  stats: CreatorSocialStats;
}

export async function getCampaignCreatorRows(campaignId: string): Promise<CampaignCreatorRow[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("campaign_creators")
    .select("*, creators(*)")
    .eq("campaign_id", campaignId)
    .order("added_at", { ascending: false });

  const list = rows ?? [];
  const creatorIds = list.map((r) => r.creator_id);
  const stats = await getSocialStatsForCreators(supabase, creatorIds);

  return list.map((row) => {
    const { creators: creator, ...campaignCreator } = row as unknown as CampaignCreator & { creators: Creator };
    return {
      campaignCreator: campaignCreator as CampaignCreator,
      creator,
      stats: stats.get(row.creator_id) ?? { followers: null, engagementRate: null, averageViews: null, platforms: [] },
    };
  });
}

export async function getCampaignDeliverables(campaignId: string): Promise<Deliverable[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("deliverables")
    .select("*")
    .eq("campaign_id", campaignId)
    .order("due_date", { ascending: true });
  return data ?? [];
}
