import { createClient } from "@/lib/supabase/server";

export interface GlobalSearchResults {
  campaigns: { id: string; name: string; subtitle: string }[];
  creators: { id: string; name: string; subtitle: string }[];
  deliverables: { id: string; campaignId: string; name: string; subtitle: string }[];
  contentPosts: { id: string; campaignId: string; deliverableId: string | null; name: string; subtitle: string }[];
  socialAccounts: { id: string; creatorId: string; name: string; subtitle: string }[];
}

const EMPTY_RESULTS: GlobalSearchResults = { campaigns: [], creators: [], deliverables: [], contentPosts: [], socialAccounts: [] };

// Extends the search surface (spec section 37) to campaigns, creators,
// deliverables, content posts, social usernames, content URLs, and
// platform post IDs — everything the brief lists, in one query per
// entity rather than one combined query PostgREST can't express cleanly.
export async function globalSearch(query: string): Promise<GlobalSearchResults> {
  const q = query.trim();
  if (q.length < 2) return EMPTY_RESULTS;
  const like = `%${q}%`;
  const supabase = await createClient();

  const [{ data: campaigns }, { data: creators }, { data: deliverables }, { data: contentPosts }, { data: socialAccounts }] =
    await Promise.all([
      supabase.from("campaigns").select("id, campaign_name, client_name").or(`campaign_name.ilike.${like},client_name.ilike.${like}`).limit(10),
      supabase.from("creators").select("id, display_name").ilike("display_name", like).limit(10),
      supabase.from("deliverables").select("id, campaign_id, title, content_type, campaigns(campaign_name)").ilike("title", like).limit(10),
      supabase
        .from("content_posts")
        .select("id, campaign_id, deliverable_id, post_url, platform_post_id, creators(display_name)")
        .or(`post_url.ilike.${like},platform_post_id.ilike.${like}`)
        .limit(10),
      supabase.from("social_accounts").select("id, creator_id, username, platform, creators(display_name)").ilike("username", like).limit(10),
    ]);

  return {
    campaigns: (campaigns ?? []).map((c) => ({ id: c.id, name: c.campaign_name, subtitle: c.client_name })),
    creators: (creators ?? []).map((c) => ({ id: c.id, name: c.display_name, subtitle: "Creator" })),
    deliverables: (deliverables ?? []).map((d) => {
      const campaign = Array.isArray(d.campaigns) ? d.campaigns[0] : d.campaigns;
      return { id: d.id, campaignId: d.campaign_id, name: d.title ?? d.content_type.replace(/_/g, " "), subtitle: campaign?.campaign_name ?? "" };
    }),
    contentPosts: (contentPosts ?? []).map((p) => {
      const creator = Array.isArray(p.creators) ? p.creators[0] : p.creators;
      return { id: p.id, campaignId: p.campaign_id, deliverableId: p.deliverable_id, name: p.post_url, subtitle: `${creator?.display_name ?? ""}${p.platform_post_id ? ` · ${p.platform_post_id}` : ""}` };
    }),
    socialAccounts: (socialAccounts ?? []).map((a) => {
      const creator = Array.isArray(a.creators) ? a.creators[0] : a.creators;
      return { id: a.id, creatorId: a.creator_id, name: `@${a.username}`, subtitle: `${creator?.display_name ?? ""} · ${a.platform}` };
    }),
  };
}
