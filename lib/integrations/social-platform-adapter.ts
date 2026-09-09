// Architecture-only integration boundary (Phase 5 spec section 40+): defines
// the shape a real social API integration would fill in during Phase 6.
// No adapter here is allowed to fabricate numbers or scrape a platform's
// HTML — every method either talks to a real, authorized API or reports
// itself as unavailable so calling code falls back to manual entry
// (lib/execution.ts / app/(app)/content/actions.ts already support that
// fallback unconditionally).

import type { SocialPlatform } from "@/types/database";

export type AdapterResult<T> = { ok: true; data: T } | { ok: false; error: string };

export interface AdapterAccountInfo {
  platformUserId: string;
  username: string;
  followers: number | null;
  following: number | null;
  postsCount: number | null;
  profileUrl: string | null;
}

export interface AdapterPost {
  platformPostId: string;
  url: string;
  publishedAt: string | null;
  caption: string | null;
  thumbnailUrl: string | null;
}

// Deliberately mirrors the distinct-metric fields on ContentMetrics
// (types/database.ts) — an adapter must report each metric separately and
// use null, never 0, for anything the platform's API doesn't return.
export interface AdapterMetrics {
  capturedAt: string;
  views: number | null;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
}

export interface SyncMetricsResult {
  postsSynced: number;
  metricsInserted: number;
}

export interface SocialPlatformAdapter {
  readonly platform: SocialPlatform;
  isConfigured(): boolean;
  connect(socialAccountId: string): Promise<AdapterResult<{ oauthUrl: string }>>;
  disconnect(socialAccountId: string): Promise<AdapterResult<void>>;
  getAccount(socialAccountId: string): Promise<AdapterResult<AdapterAccountInfo>>;
  getPosts(socialAccountId: string): Promise<AdapterResult<AdapterPost[]>>;
  getPostMetrics(postUrl: string): Promise<AdapterResult<AdapterMetrics>>;
  syncMetrics(socialAccountId: string): Promise<AdapterResult<SyncMetricsResult>>;
}

const NOT_CONFIGURED_ERROR =
  "No live API connection is configured for this platform yet. Enter data manually.";

// The only implementation that exists today. It satisfies the full
// interface but never returns fabricated data — every method reports
// unavailability so the UI's manual-entry path (addEvidence /
// addMetricSnapshot) remains the source of truth until a real adapter is
// registered in getSocialPlatformAdapter below.
class NotConfiguredAdapter implements SocialPlatformAdapter {
  constructor(public readonly platform: SocialPlatform) {}

  isConfigured(): boolean {
    return false;
  }

  async connect(): Promise<AdapterResult<{ oauthUrl: string }>> {
    return { ok: false, error: NOT_CONFIGURED_ERROR };
  }

  async disconnect(): Promise<AdapterResult<void>> {
    return { ok: false, error: NOT_CONFIGURED_ERROR };
  }

  async getAccount(): Promise<AdapterResult<AdapterAccountInfo>> {
    return { ok: false, error: NOT_CONFIGURED_ERROR };
  }

  async getPosts(): Promise<AdapterResult<AdapterPost[]>> {
    return { ok: false, error: NOT_CONFIGURED_ERROR };
  }

  async getPostMetrics(): Promise<AdapterResult<AdapterMetrics>> {
    return { ok: false, error: NOT_CONFIGURED_ERROR };
  }

  async syncMetrics(): Promise<AdapterResult<SyncMetricsResult>> {
    return { ok: false, error: NOT_CONFIGURED_ERROR };
  }
}

// Registry: Phase 6 registers real adapters (Instagram Graph API, TikTok
// Display API, X API, etc.) here per platform. Until then every platform
// resolves to the manual-fallback adapter above — deliberately, so nobody
// mistakes "not yet built" for "returns zero".
export function getSocialPlatformAdapter(platform: SocialPlatform): SocialPlatformAdapter {
  return new NotConfiguredAdapter(platform);
}
