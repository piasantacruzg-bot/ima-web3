// Integration Center data (spec section 3). Splits into a pure status
// rollup (testable without a database) and a DB-touching wrapper that
// feeds it real social_accounts / integration_tokens / sync log rows.

import { createClient } from "@/lib/supabase/server";
import type { OauthStatus, SyncStatus, SocialPlatform } from "@/types/database";

type Supabase = Awaited<ReturnType<typeof createClient>>;
import { isInstagramConfigured } from "@/lib/integrations/instagram/oauth";
import { isTikTokConfigured } from "@/lib/integrations/tiktok/oauth";
import { isXConfigured } from "@/lib/integrations/x/oauth";
import { isYouTubeConfigured } from "@/lib/integrations/youtube/oauth";
import { isGoogleDriveConfigured } from "@/lib/integrations/google-drive/adapter";

export type IntegrationStatus = "not_connected" | "connected" | "needs_reauth" | "error" | "partial";

export interface AccountStatusInput {
  oauth_status: OauthStatus;
  sync_status: SyncStatus;
}

// Pure rollup: given every social account for one platform, decide the
// single status badge the Integration Center shows for that platform.
export function summarizePlatformStatus(accounts: AccountStatusInput[]): IntegrationStatus {
  if (accounts.length === 0) return "not_connected";

  const connected = accounts.filter((a) => a.oauth_status === "connected" && a.sync_status !== "error");
  const needsReauth = accounts.filter((a) => a.oauth_status === "expired" || a.oauth_status === "revoked");
  const errored = accounts.filter((a) => a.oauth_status === "error" || a.sync_status === "error");

  if (connected.length === accounts.length) return "connected";
  if (connected.length > 0) return "partial";
  if (needsReauth.length > 0) return "needs_reauth";
  if (errored.length > 0) return "error";
  return "not_connected";
}

export interface ConnectedAccountSummary {
  socialAccountId: string;
  creatorId: string;
  creatorName: string;
  username: string;
  oauthStatus: OauthStatus;
  syncStatus: SyncStatus;
}

export interface PlatformIntegrationSummary {
  platform: SocialPlatform;
  status: IntegrationStatus;
  isConfigured: boolean;
  connectedAccounts: ConnectedAccountSummary[];
  lastSyncAt: string | null;
  permissions: string[];
  connectionOwners: string[];
  syncErrorCount: number;
}

const REAL_PROVIDER_PLATFORMS: SocialPlatform[] = ["instagram", "tiktok", "x", "youtube"];

const PROVIDER_CONFIGURED: Record<SocialPlatform, () => boolean> = {
  instagram: isInstagramConfigured,
  tiktok: isTikTokConfigured,
  x: isXConfigured,
  youtube: isYouTubeConfigured,
  facebook: () => false,
  other: () => false,
};

export async function getIntegrationSummaries(): Promise<PlatformIntegrationSummary[]> {
  const supabase = await createClient();

  const [{ data: accounts }, { data: tokens }, { data: recentLogs }] = await Promise.all([
    supabase.from("social_accounts").select("id, creator_id, platform, username, oauth_status, sync_status, creators(display_name)"),
    supabase.from("integration_tokens").select("provider, social_account_id, scopes, connected_by, profiles(full_name, email)"),
    supabase.from("integration_sync_logs").select("provider, social_account_id, status, started_at").order("started_at", { ascending: false }).limit(500),
  ]);

  return REAL_PROVIDER_PLATFORMS.map((platform) => {
    const platformAccounts = (accounts ?? []).filter((a) => a.platform === platform);
    const status = summarizePlatformStatus(platformAccounts.map((a) => ({ oauth_status: a.oauth_status, sync_status: a.sync_status })));

    const connectedAccounts: ConnectedAccountSummary[] = platformAccounts.map((a) => {
      const creator = Array.isArray(a.creators) ? a.creators[0] : a.creators;
      return {
        socialAccountId: a.id,
        creatorId: a.creator_id,
        creatorName: creator?.display_name ?? "Unknown creator",
        username: a.username,
        oauthStatus: a.oauth_status,
        syncStatus: a.sync_status,
      };
    });

    const accountIds = new Set(platformAccounts.map((a) => a.id));
    const platformLogs = (recentLogs ?? []).filter((l) => l.provider === platform || (l.social_account_id && accountIds.has(l.social_account_id)));
    const lastSyncAt = platformLogs[0]?.started_at ?? null;
    const syncErrorCount = platformLogs.filter((l) => l.status === "failed").length;

    const platformTokens = (tokens ?? []).filter((t) => t.provider === platform);
    const permissions = [...new Set(platformTokens.flatMap((t) => t.scopes ?? []))];
    const connectionOwners = [
      ...new Set(
        platformTokens
          .map((t) => {
            const profile = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles;
            return profile?.full_name || profile?.email || null;
          })
          .filter((name): name is string => Boolean(name))
      ),
    ];

    return {
      platform,
      status,
      isConfigured: PROVIDER_CONFIGURED[platform](),
      connectedAccounts,
      lastSyncAt,
      permissions,
      connectionOwners,
      syncErrorCount,
    };
  });
}

export interface CampaignAutomationSummary {
  connectedPlatforms: SocialPlatform[];
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  contentDiscovered: number;
  metricsUpdated: number;
  syncErrors: number;
}

// "Next sync" reflects last sync + the configured interval
// (app_settings.sync_frequency_hours) — used both as an informational
// display and, via isSyncDue below, as the real gate the scheduled sync
// cron route (/api/cron/sync) uses to decide which campaigns to sync.
export async function getCampaignAutomationSummary(campaignId: string, supabaseOverride?: Supabase): Promise<CampaignAutomationSummary> {
  const supabase = supabaseOverride ?? (await createClient());
  const { data: campaignCreators } = await supabase.from("campaign_creators").select("creator_id").eq("campaign_id", campaignId);
  const creatorIds = [...new Set((campaignCreators ?? []).map((c) => c.creator_id))];
  if (creatorIds.length === 0) {
    return { connectedPlatforms: [], lastSyncAt: null, nextSyncAt: null, contentDiscovered: 0, metricsUpdated: 0, syncErrors: 0 };
  }

  const { data: accounts } = await supabase.from("social_accounts").select("id, platform, oauth_status").in("creator_id", creatorIds);
  const connectedPlatforms = [...new Set((accounts ?? []).filter((a) => a.oauth_status === "connected").map((a) => a.platform))];
  const accountIds = (accounts ?? []).map((a) => a.id);

  const { data: logs } =
    accountIds.length > 0
      ? await supabase
          .from("integration_sync_logs")
          .select("started_at, status, records_created, records_updated")
          .in("social_account_id", accountIds)
          .order("started_at", { ascending: false })
          .limit(200)
      : { data: [] as { started_at: string; status: string; records_created: number; records_updated: number }[] };

  const lastSyncAt = logs?.[0]?.started_at ?? null;
  const { data: appSettings } = await supabase.from("app_settings").select("sync_frequency_hours").eq("id", 1).maybeSingle();
  const freqHours = appSettings?.sync_frequency_hours ?? 24;
  const nextSyncAt = lastSyncAt ? new Date(new Date(lastSyncAt).getTime() + freqHours * 60 * 60 * 1000).toISOString() : null;

  const contentDiscovered = (logs ?? []).reduce((sum, l) => sum + l.records_created, 0);
  const metricsUpdated = (logs ?? []).reduce((sum, l) => sum + l.records_updated, 0);
  const syncErrors = (logs ?? []).filter((l) => l.status === "failed").length;

  return { connectedPlatforms, lastSyncAt, nextSyncAt, contentDiscovered, metricsUpdated, syncErrors };
}

// Pure gate the scheduled sync cron route uses to decide whether a
// campaign's next sync is due yet: no nextSyncAt means it has never been
// synced, which counts as due immediately.
export function isSyncDue(nextSyncAt: string | null, now: Date = new Date()): boolean {
  if (!nextSyncAt) return true;
  return new Date(nextSyncAt).getTime() <= now.getTime();
}
