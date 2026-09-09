// Architecture-only integration boundary (Phase 5) filled in with real
// provider structure in Phase 6: defines the shape every social platform
// adapter implements. No adapter is allowed to fabricate numbers or
// scrape a platform's HTML — every method either talks to a real,
// authorized API or reports itself as unavailable/unconfigured so
// calling code (lib/sync.ts, app/(app)/content/actions.ts) falls back to
// manual entry unconditionally.

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

export interface GetPostsOptions {
  since?: string;
  limit?: number;
}

export interface SyncResult {
  recordsFound: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsFailed: number;
}

// One instance per connected social account (constructed with its id) —
// matches how OAuth tokens and rate limits are scoped in every real
// provider API.
export interface SocialPlatformAdapter {
  readonly platform: SocialPlatform;
  readonly socialAccountId: string;
  isConfigured(): boolean;
  connect(): Promise<AdapterResult<{ oauthUrl: string }>>;
  disconnect(): Promise<AdapterResult<void>>;
  getAccount(): Promise<AdapterResult<AdapterAccountInfo>>;
  getPosts(options?: GetPostsOptions): Promise<AdapterResult<AdapterPost[]>>;
  getPost(platformPostId: string): Promise<AdapterResult<AdapterPost>>;
  getPostMetrics(platformPostId: string): Promise<AdapterResult<AdapterMetrics>>;
  syncPost(platformPostId: string): Promise<AdapterResult<SyncResult>>;
  syncAccount(): Promise<AdapterResult<SyncResult>>;
}

export const NOT_CONFIGURED_ERROR =
  "No live API connection is configured for this platform yet. Enter data manually.";

// Base implementation every real (not-yet-credentialed) provider adapter
// extends: satisfies the full interface but never returns fabricated
// data — every method reports unavailability so the UI's manual-entry
// path (addEvidence / addMetricSnapshot) remains the source of truth
// until real OAuth credentials are configured for that provider.
export abstract class NotConfiguredAdapter implements SocialPlatformAdapter {
  abstract readonly platform: SocialPlatform;

  constructor(public readonly socialAccountId: string) {}

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

  async getPosts(_options?: GetPostsOptions): Promise<AdapterResult<AdapterPost[]>> {
    return { ok: false, error: NOT_CONFIGURED_ERROR };
  }

  async getPost(_platformPostId: string): Promise<AdapterResult<AdapterPost>> {
    return { ok: false, error: NOT_CONFIGURED_ERROR };
  }

  async getPostMetrics(_platformPostId: string): Promise<AdapterResult<AdapterMetrics>> {
    return { ok: false, error: NOT_CONFIGURED_ERROR };
  }

  async syncPost(_platformPostId: string): Promise<AdapterResult<SyncResult>> {
    return { ok: false, error: NOT_CONFIGURED_ERROR };
  }

  async syncAccount(): Promise<AdapterResult<SyncResult>> {
    return { ok: false, error: NOT_CONFIGURED_ERROR };
  }
}
