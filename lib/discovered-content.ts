import { createClient } from "@/lib/supabase/server";
import type { DiscoveredContent, SocialPlatform } from "@/types/database";

export interface DiscoveredContentRow extends DiscoveredContent {
  creatorName: string;
}

async function getPending(supabase: Awaited<ReturnType<typeof createClient>>): Promise<DiscoveredContentRow[]> {
  const { data } = await supabase
    .from("discovered_content")
    .select("*, creators(display_name)")
    .eq("match_status", "pending")
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => {
    const creator = Array.isArray(row.creators) ? row.creators[0] : row.creators;
    return { ...row, creatorName: creator?.display_name ?? "Unknown creator" };
  });
}

// /content/matches: a discovered post with at least one plausible
// deliverable — the human picks one (or ignores it).
export async function getAmbiguousDiscoveredContent(): Promise<DiscoveredContentRow[]> {
  const supabase = await createClient();
  const rows = await getPending(supabase);
  return rows.filter((r) => r.candidates.length > 0);
}

// /content/import: a discovered post the matcher found no plausible
// deliverable for at all — the human assigns one manually from every
// still-open deliverable for that creator/platform.
export async function getUnmatchedDiscoveredContent(): Promise<DiscoveredContentRow[]> {
  const supabase = await createClient();
  const rows = await getPending(supabase);
  return rows.filter((r) => r.candidates.length === 0);
}

export interface DeliverableOption {
  deliverableId: string;
  label: string;
  confidence?: number;
}

export async function getOpenDeliverableOptions(creatorId: string | null, platform: SocialPlatform): Promise<DeliverableOption[]> {
  if (!creatorId) return [];
  const supabase = await createClient();
  const [{ data: deliverables }, { data: existingPosts }] = await Promise.all([
    supabase
      .from("deliverables")
      .select("id, content_type, campaigns(campaign_name)")
      .eq("creator_id", creatorId)
      .eq("platform", platform)
      .not("status", "in", "(cancelled)"),
    supabase.from("content_posts").select("deliverable_id").eq("creator_id", creatorId).eq("platform", platform),
  ]);

  const tracked = new Set((existingPosts ?? []).map((p) => p.deliverable_id).filter(Boolean));

  return (deliverables ?? [])
    .filter((d) => !tracked.has(d.id))
    .map((d) => {
      const campaign = Array.isArray(d.campaigns) ? d.campaigns[0] : d.campaigns;
      return { deliverableId: d.id, label: `${campaign?.campaign_name ?? "Unknown campaign"} — ${d.content_type.replace(/_/g, " ")}` };
    });
}
