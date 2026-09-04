import { createClient } from "@/lib/supabase/server";
import type {
  Creator,
  CreatorStatus,
  CreatorType,
  CreatorWithStats,
  SocialAccount,
  SocialPlatform,
} from "@/types/database";
import { CREATOR_SORT_OPTIONS, type CreatorSortKey } from "@/lib/creator-sort-options";

export { CREATOR_SORT_OPTIONS, type CreatorSortKey };

export interface CreatorFilters {
  search?: string;
  platform?: SocialPlatform;
  country?: string;
  category?: string;
  niche?: string;
  creatorType?: CreatorType;
  status?: CreatorStatus;
  minFollowers?: number;
  minEngagement?: number;
}

const PAGE_SIZE = 25;

export async function getCreators({
  filters = {},
  sort = "recently_added",
  page = 1,
}: {
  filters?: CreatorFilters;
  sort?: CreatorSortKey;
  page?: number;
}): Promise<{ creators: CreatorWithStats[]; total: number; pageSize: number }> {
  const supabase = await createClient();

  let query = supabase.from("creators_with_stats").select("*", { count: "exact" });

  // Search is deliberately limited to the creator's display name — matching
  // on social handles would need a join back to social_accounts, which this
  // aggregate view doesn't carry. Good enough for "find this creator by
  // name" (the common case); handle search is a reasonable Phase 2.x follow-up.
  if (filters.search) {
    query = query.ilike("display_name", `%${filters.search}%`);
  }
  if (filters.platform) {
    query = query.contains("platforms", [filters.platform]);
  }
  if (filters.country) {
    query = query.eq("country", filters.country);
  }
  if (filters.category) {
    query = query.contains("categories", [filters.category]);
  }
  if (filters.niche) {
    query = query.contains("niches", [filters.niche]);
  }
  if (filters.creatorType) {
    query = query.eq("creator_type", filters.creatorType);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.minFollowers) {
    query = query.gte("max_followers", filters.minFollowers);
  }
  if (filters.minEngagement) {
    query = query.gte("avg_engagement_rate", filters.minEngagement);
  }

  const sortOption = CREATOR_SORT_OPTIONS[sort];
  query = query.order(sortOption.column, { ascending: sortOption.ascending });

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return { creators: data ?? [], total: count ?? 0, pageSize: PAGE_SIZE };
}

// Distinct values for filter dropdowns — queried from the real data rather
// than hardcoded, so filters never offer an option with zero matches.
export async function getCreatorFilterOptions() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("creators")
    .select("country, categories, niches, creator_type, status");

  const countries = new Set<string>();
  const categories = new Set<string>();
  const niches = new Set<string>();

  for (const row of data ?? []) {
    if (row.country) countries.add(row.country);
    for (const c of row.categories ?? []) categories.add(c);
    for (const n of row.niches ?? []) niches.add(n);
  }

  return {
    countries: [...countries].sort(),
    categories: [...categories].sort(),
    niches: [...niches].sort(),
  };
}

export interface CreatorCampaignHistoryRow {
  campaign_creator_id: string;
  status: string;
  negotiated_fee: number | null;
  approved_fee: number | null;
  added_at: string;
  campaign: { id: string; campaign_name: string; brand_name: string | null; status: string } | null;
}

export interface CreatorProfile {
  creator: Creator;
  socialAccounts: SocialAccount[];
  campaignHistory: CreatorCampaignHistoryRow[];
}

export async function getCreatorProfile(id: string): Promise<CreatorProfile | null> {
  const supabase = await createClient();

  const [{ data: creator }, { data: socialAccounts }, { data: campaignHistory }] =
    await Promise.all([
      supabase.from("creators").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("social_accounts")
        .select("*")
        .eq("creator_id", id)
        .order("followers", { ascending: false }),
      supabase
        .from("campaign_creators")
        .select(
          "id, status, negotiated_fee, approved_fee, added_at, campaigns(id, campaign_name, brand_name, status)"
        )
        .eq("creator_id", id)
        .order("added_at", { ascending: false }),
    ]);

  if (!creator) return null;

  return {
    creator,
    socialAccounts: socialAccounts ?? [],
    campaignHistory: (campaignHistory ?? []).map((row) => ({
      campaign_creator_id: row.id as string,
      status: row.status as string,
      negotiated_fee: row.negotiated_fee as number | null,
      approved_fee: row.approved_fee as number | null,
      added_at: row.added_at as string,
      campaign: row.campaigns as unknown as CreatorCampaignHistoryRow["campaign"],
    })),
  };
}
