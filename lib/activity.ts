import { createClient } from "@/lib/supabase/server";
import type { AuditLogEntry } from "@/types/database";
import type { DeliverableExecutionRow } from "@/lib/execution";

export interface ActivityEntry extends AuditLogEntry {
  actorName: string;
}

// Reuses the existing audit_log infrastructure (lib/audit.ts writes to
// it since Phase 2) rather than introducing a parallel activity table.
// audit_log rows don't carry a campaign_id, so this gathers every entity
// id that belongs to the campaign's already-fetched execution rows and
// queries audit_log per entity type, in parallel.
export async function getCampaignActivity(
  campaignId: string,
  rows: DeliverableExecutionRow[],
  limit = 30
): Promise<ActivityEntry[]> {
  const supabase = await createClient();

  const deliverableIds = rows.map((r) => r.deliverable.id);
  const storyInstanceIds = rows.flatMap((r) => r.storyInstances.map((si) => si.instance.id));
  const contentPostIds = rows.map((r) => r.contentPost?.id).filter((id): id is string => Boolean(id));
  const evidenceIds = rows.flatMap((r) => r.evidence.map((e) => e.id));

  const fetchers: PromiseLike<{ data: AuditLogEntry[] | null }>[] = [
    supabase.from("audit_log").select("*").eq("entity_type", "campaigns").eq("entity_id", campaignId),
  ];
  if (deliverableIds.length > 0) {
    fetchers.push(supabase.from("audit_log").select("*").eq("entity_type", "deliverables").in("entity_id", deliverableIds));
  }
  if (storyInstanceIds.length > 0) {
    fetchers.push(supabase.from("audit_log").select("*").eq("entity_type", "story_instances").in("entity_id", storyInstanceIds));
  }
  if (contentPostIds.length > 0) {
    fetchers.push(supabase.from("audit_log").select("*").eq("entity_type", "content_posts").in("entity_id", contentPostIds));
  }
  if (evidenceIds.length > 0) {
    fetchers.push(supabase.from("audit_log").select("*").eq("entity_type", "content_evidence").in("entity_id", evidenceIds));
  }

  const results = await Promise.all(fetchers);
  const merged = results.flatMap((r) => r.data ?? []);
  merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const entries = merged.slice(0, limit);

  const userIds = [...new Set(entries.map((e) => e.user_id).filter((id): id is string => Boolean(id)))];
  const actorNames = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", userIds);
    for (const p of profiles ?? []) actorNames.set(p.id, p.full_name || p.email);
  }

  return entries.map((e) => ({ ...e, actorName: (e.user_id && actorNames.get(e.user_id)) || "System" }));
}

// Humanizes an audit_log action string (e.g. "deliverable_status_changed"
// -> "Deliverable status changed") without hardcoding every action name
// from every phase.
export function humanizeAction(action: string): string {
  const words = action.split("_");
  return words[0][0].toUpperCase() + words[0].slice(1) + " " + words.slice(1).join(" ");
}
