import { createClient } from "@/lib/supabase/server";

export interface DashboardData {
  activeCampaignsCount: number;
  campaignsEndingSoon: { id: string; campaign_name: string; end_date: string | null }[];
  pendingDeliverablesCount: number;
  overdueDeliverables: {
    id: string;
    due_date: string | null;
    content_type: string;
    creator_display_name: string | null;
    campaign_name: string | null;
  }[];
  recentCreators: { id: string; display_name: string; status: string; created_at: string }[];
  recentContent: {
    id: string;
    platform: string;
    post_url: string;
    published_at: string | null;
    creator_display_name: string | null;
    campaign_name: string | null;
  }[];
  totalCreatorsCount: number;
  totalCampaignsCount: number;
}

// All real queries against Supabase — no synthetic numbers. Every count
// here reflects whatever is actually in the database (demo data until real
// creators/campaigns are imported).
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const twoWeeksOut = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [
    activeCampaigns,
    campaignsEndingSoon,
    pendingDeliverables,
    overdueDeliverables,
    recentCreators,
    recentContent,
    totalCreators,
    totalCampaigns,
  ] = await Promise.all([
    supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("campaigns")
      .select("id, campaign_name, end_date")
      .eq("status", "active")
      .gte("end_date", today)
      .lte("end_date", twoWeeksOut)
      .order("end_date", { ascending: true })
      .limit(5),
    supabase
      .from("deliverables")
      .select("id", { count: "exact", head: true })
      .not("status", "in", "(published,cancelled)"),
    // Queried against the base table (not the deliverables_with_computed_status
    // view) because PostgREST's foreign-key embedding is only guaranteed for
    // real tables — "late" here is due_date in the past and not
    // published/cancelled, matching the view's own definition.
    supabase
      .from("deliverables")
      .select("id, due_date, content_type, creators(display_name), campaigns(campaign_name)")
      .lt("due_date", today)
      .not("status", "in", "(published,cancelled)")
      .order("due_date", { ascending: true })
      .limit(5),
    supabase
      .from("creators")
      .select("id, display_name, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("content_posts")
      .select("id, platform, post_url, published_at, creators(display_name), campaigns(campaign_name)")
      .order("published_at", { ascending: false })
      .limit(5),
    supabase.from("creators").select("id", { count: "exact", head: true }),
    supabase.from("campaigns").select("id", { count: "exact", head: true }),
  ]);

  return {
    activeCampaignsCount: activeCampaigns.count ?? 0,
    campaignsEndingSoon: campaignsEndingSoon.data ?? [],
    pendingDeliverablesCount: pendingDeliverables.count ?? 0,
    overdueDeliverables: (overdueDeliverables.data ?? []).map((d) => ({
      id: d.id as string,
      due_date: d.due_date as string | null,
      content_type: d.content_type as string,
      // Supabase's typed client infers embedded-relation shape loosely
      // here since deliverables_with_computed_status is a view; cast at
      // the boundary rather than fighting the generated types.
      creator_display_name: (d as unknown as { creators: { display_name: string } | null })
        .creators?.display_name ?? null,
      campaign_name: (d as unknown as { campaigns: { campaign_name: string } | null }).campaigns
        ?.campaign_name ?? null,
    })),
    recentCreators: recentCreators.data ?? [],
    recentContent: (recentContent.data ?? []).map((c) => ({
      id: c.id as string,
      platform: c.platform as string,
      post_url: c.post_url as string,
      published_at: c.published_at as string | null,
      creator_display_name: (c as unknown as { creators: { display_name: string } | null })
        .creators?.display_name ?? null,
      campaign_name: (c as unknown as { campaigns: { campaign_name: string } | null }).campaigns
        ?.campaign_name ?? null,
    })),
    totalCreatorsCount: totalCreators.count ?? 0,
    totalCampaignsCount: totalCampaigns.count ?? 0,
  };
}
