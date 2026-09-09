import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { syncCampaignContent } from "@/lib/sync";
import { runAutomationRules } from "@/lib/automation";
import { getCampaignAutomationSummary, isSyncDue } from "@/lib/integrations-status";
import { logAudit } from "@/lib/audit";

// Scheduled sync (spec section 19: no cron infra required, but real
// scheduling isn't blocked either once a platform provides one). This is
// the actual job: no user session exists here, so it runs entirely on
// the service-role client (bypasses RLS by design — the same client used
// for privileged server-only work elsewhere). Any scheduler that can hit
// an HTTPS URL on an interval can drive this route (Vercel Cron is wired
// up by default — see vercel.json — but a GitHub Actions schedule or
// Supabase pg_cron + pg_net call would work identically).
//
// Per campaign, "due" is computed from the same last-sync +
// app_settings.sync_frequency_hours calculation the Integration Center
// already shows as "next sync" (lib/integrations-status.ts) — this route
// is what makes that timestamp real instead of purely informational.
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id, campaign_name")
    .eq("status", "active")
    .is("archived_at", null);

  const now = new Date();
  const campaignResults: { campaignId: string; synced: boolean; accountsSynced: number }[] = [];

  for (const campaign of campaigns ?? []) {
    const summary = await getCampaignAutomationSummary(campaign.id, supabase);
    if (summary.connectedPlatforms.length === 0 || !isSyncDue(summary.nextSyncAt, now)) {
      campaignResults.push({ campaignId: campaign.id, synced: false, accountsSynced: 0 });
      continue;
    }

    const outcomes = await syncCampaignContent(campaign.id, supabase);
    campaignResults.push({ campaignId: campaign.id, synced: true, accountsSynced: outcomes.length });
  }

  // Missing-metrics/evidence/overdue/expired-connection notifications
  // depend on fresh data, so this runs after every sync, not on its own
  // separate schedule.
  const automationResult = await runAutomationRules(supabase);

  const campaignsSynced = campaignResults.filter((r) => r.synced).length;
  await logAudit(supabase, "scheduled_sync_executed", "campaigns", randomUUID(), null, {
    campaigns_checked: campaignResults.length,
    campaigns_synced: campaignsSynced,
    notifications_created: automationResult.notificationsCreated,
  });

  return NextResponse.json({
    campaignsChecked: campaignResults.length,
    campaignsSynced,
    automation: automationResult,
  });
}
