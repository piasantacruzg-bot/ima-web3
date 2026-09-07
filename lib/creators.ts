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
  tag?: string;
  creatorType?: CreatorType;
  status?: CreatorStatus;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagement?: number;
  maxEngagement?: number;
  minBrandFit?: number;
  maxBrandFit?: number;
  minRating?: number;
  maxRating?: number;
  includeArchived?: boolean;
}

const PAGE_SIZE = 25;

// `query` is typed loosely here on purpose: postgrest-js's filter-builder
// generics narrow with every chained call in a way that doesn't thread
// cleanly through a shared helper. Both call sites (getCreators,
// getAllMatchingCreators) build their own properly-typed query and only
// hand it to this function to apply the same filter predicates once.
async function applyCreatorFilters(
  supabase: Awaited<ReturnType<typeof createClient>>,
  query: any,
  filters: CreatorFilters
): Promise<any> {
  if (!filters.includeArchived) {
    query = query.is("archived_at", null);
  }

  // Search matches name/email/location directly on this view, plus a
  // separate lookup against social_accounts for handle matches (spec
  // section 2) — the view can't carry per-account usernames since it's
  // already aggregated across accounts.
  if (filters.search) {
    const term = filters.search.trim();
    const escaped = term.replace(/[%,]/g, "");
    const orParts = [
      `display_name.ilike.%${escaped}%`,
      `first_name.ilike.%${escaped}%`,
      `last_name.ilike.%${escaped}%`,
      `email.ilike.%${escaped}%`,
      `city.ilike.%${escaped}%`,
      `country.ilike.%${escaped}%`,
    ];

    const { data: handleMatches } = await supabase
      .from("social_accounts")
      .select("creator_id")
      .ilike("username", `%${escaped}%`);
    const matchedIds = [...new Set((handleMatches ?? []).map((r) => r.creator_id))];
    if (matchedIds.length > 0) {
      orParts.push(`id.in.(${matchedIds.join(",")})`);
    }

    query = query.or(orParts.join(","));
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
  if (filters.tag) {
    query = query.contains("tags", [filters.tag]);
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
  if (filters.maxFollowers) {
    query = query.lte("max_followers", filters.maxFollowers);
  }
  if (filters.minEngagement) {
    query = query.gte("avg_engagement_rate", filters.minEngagement);
  }
  if (filters.maxEngagement) {
    query = query.lte("avg_engagement_rate", filters.maxEngagement);
  }
  if (filters.minBrandFit) {
    query = query.gte("brand_fit_score", filters.minBrandFit);
  }
  if (filters.maxBrandFit) {
    query = query.lte("brand_fit_score", filters.maxBrandFit);
  }
  if (filters.minRating) {
    query = query.gte("internal_rating", filters.minRating);
  }
  if (filters.maxRating) {
    query = query.lte("internal_rating", filters.maxRating);
  }

  // Wrapped in an object rather than returned bare: postgrest-js query
  // builders are "thenable" (awaiting one executes the request), so
  // `return query` from this async function would make JS's promise
  // resolution treat it as a promise to chain onto — silently running the
  // query early and resolving to `{data, error, count}` instead of handing
  // back the still-buildable query. Wrapping it in a plain object sidesteps
  // that.
  return { query };
}

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
  let { query } = await applyCreatorFilters(
    supabase,
    supabase.from("creators_with_stats").select("*", { count: "exact" }),
    filters
  );

  const sortOption = CREATOR_SORT_OPTIONS[sort];
  query = query.order(sortOption.column, { ascending: sortOption.ascending });

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;
  if (error) throw error;

  return { creators: data ?? [], total: count ?? 0, pageSize: PAGE_SIZE };
}

// Unpaginated (capped) variant for CSV/XLSX export — export must reflect
// every creator matching the current filters, not just the visible page
// (spec section 19), but we still cap it so a runaway export can't pull an
// unbounded result set.
const EXPORT_ROW_CAP = 5000;

export async function getAllMatchingCreators(
  filters: CreatorFilters,
  sort: CreatorSortKey = "recently_added"
): Promise<CreatorWithStats[]> {
  const supabase = await createClient();
  let { query } = await applyCreatorFilters(
    supabase,
    supabase.from("creators_with_stats").select("*"),
    filters
  );

  const sortOption = CREATOR_SORT_OPTIONS[sort];
  query = query.order(sortOption.column, { ascending: sortOption.ascending }).limit(EXPORT_ROW_CAP);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

// Distinct values for filter dropdowns — queried from the real data rather
// than hardcoded, so filters never offer an option with zero matches.
export async function getCreatorFilterOptions() {
  const supabase = await createClient();
  const [{ data }, { data: tagRows }] = await Promise.all([
    supabase.from("creators").select("country, categories, niches, creator_type, status"),
    supabase.from("creator_tags").select("name").order("name"),
  ]);

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
    tags: (tagRows ?? []).map((t) => t.name),
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

export interface CreatorNoteWithAuthor {
  id: string;
  body: string;
  created_at: string;
  author_name: string | null;
}

export interface CreatorProfile {
  creator: Creator;
  socialAccounts: SocialAccount[];
  campaignHistory: CreatorCampaignHistoryRow[];
  notes: CreatorNoteWithAuthor[];
  tags: { id: string; name: string }[];
  allTags: { id: string; name: string }[];
}

export async function getCreatorProfile(id: string): Promise<CreatorProfile | null> {
  const supabase = await createClient();

  const [
    { data: creator },
    { data: socialAccounts },
    { data: campaignHistory },
    { data: notes },
    { data: tagAssignments },
    { data: allTags },
  ] = await Promise.all([
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
    supabase
      .from("creator_notes")
      .select("id, body, created_at, profiles(full_name, email)")
      .eq("creator_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("creator_tag_assignments")
      .select("creator_tags(id, name)")
      .eq("creator_id", id),
    supabase.from("creator_tags").select("id, name").order("name"),
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
    notes: (notes ?? []).map((n) => ({
      id: n.id as string,
      body: n.body as string,
      created_at: n.created_at as string,
      author_name:
        (n as unknown as { profiles: { full_name: string | null; email: string } | null })
          .profiles?.full_name ??
        (n as unknown as { profiles: { full_name: string | null; email: string } | null })
          .profiles?.email ??
        null,
    })),
    tags: (tagAssignments ?? [])
      .map((row) => (row as unknown as { creator_tags: { id: string; name: string } | null }).creator_tags)
      .filter((t): t is { id: string; name: string } => Boolean(t)),
    allTags: allTags ?? [],
  };
}
