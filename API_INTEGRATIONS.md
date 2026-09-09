# Social platform API integrations

Status as of Phase 6: **architecture built and wired up end-to-end; no
live credentials configured in this environment.** `/settings/integrations`
lists each platform's real connection status (computed from
`social_accounts`/`integration_tokens`/`integration_sync_logs` — nothing
hardcoded), and the sync/matching/automation engines behind it are real,
tested code — they just have nothing to call yet, since no OAuth app
credentials exist here. Setting the env vars below (a real Meta/TikTok/X/
Google app) is what turns "not connected" into "connected."

## Principle (spec rule 8 / section 51)

Official APIs are the only source for "automatic" data. If a platform's API
can't provide a metric, the field stays manually editable and the record's
`collection_method` / `source` says `manual`, `url_import`, or `screenshot`
— never `api`. The app must always be able to distinguish **automatic**
(real API data), **semi-automatic** (URL identified the content, metrics
entered by hand), and **manual** (fully hand-entered), and every metric
row carries that distinction (`content_metrics.source`,
`content_posts.collection_method`). No adapter anywhere scrapes a platform
or fabricates a metric — see `lib/integrations/social-platform-adapter.ts`'s
`NotConfiguredAdapter` base class, which every real provider adapter
extends until real credentials exist.

## Database support

- `social_accounts.oauth_status` / `access_token_reference` /
  `token_expires_at` / `last_synced_at` / `sync_status` / `sync_error`
  (Phase 1) — still the single source of truth for a creator's connection
  state; Phase 6 never duplicated this onto a second table.
- `integration_tokens` (Phase 6) — encrypted OAuth tokens (see below),
  one row per connected social account, or one provider-level row for
  Google Drive.
- `integration_sync_logs` (Phase 6) — one row per sync run, so "last
  sync" / "sync errors" reflect real history, not just a single mutable
  timestamp.
- `automation_rules` (Phase 6) — the four deterministic rules
  (`deliverable_overdue`, `metrics_missing`, `evidence_missing`,
  `connection_expired`), each with an on/off switch and small config.
- `discovered_content` (Phase 6) — holds a synced post between discovery
  and a human decision when the match is ambiguous or nonexistent (spec
  section 14) — reviewed at `/content/matches` and `/content/import`.
- `content_posts.collection_method`, `sync_status`, `sync_error`,
  `last_synced_at`, `content_status` (`active`/`unavailable` — spec
  section 42), plus a `(platform, platform_post_id)` unique index for
  idempotent re-sync.
- `content_metrics.source`, `is_estimated`.
- `app_settings.sync_frequency_hours` (configurable poll interval).

**Token storage:** `integration_tokens.access_token_encrypted` /
`refresh_token_encrypted` hold AES-256-GCM ciphertext only —
`lib/integrations/token-store.ts` encrypts/decrypts server-side using
`INTEGRATION_TOKEN_ENCRYPTION_KEY` (see `.env.example`) and is never
imported by client code. A plaintext token is never written to this
table, logged, or sent to the browser.

## Adapter architecture (built)

`lib/integrations/social-platform-adapter.ts` defines the shared
interface; one folder per provider under `lib/integrations/`:

```ts
interface SocialPlatformAdapter {
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
```

`AdapterResult<T>` is `{ ok: true; data: T } | { ok: false; error: string }`
— an unavailable metric or an unconfigured provider is a first-class
`{ ok: false }`, never a fabricated value. `lib/integrations/registry.ts`
maps a platform to its real adapter; `lib/integrations/mock/adapter.ts` is
a separate, test-only adapter used by the acceptance test and never
reachable from the registry, so it can't leak into production UI.

Each real provider's `isConfigured()`/`connect()` builds an actual,
correctly-formed OAuth authorize URL once its env vars are set (see
`lib/integrations/<provider>/oauth.ts`) — Instagram via Facebook Graph,
TikTok with `client_key` (not `client_id`), X with OAuth 2.0 + PKCE,
YouTube/Google Drive via standard Google OAuth. **The callback/token-exchange
endpoint is intentionally not implemented** — it can't be exercised or
verified without a real registered app for each provider. Wiring it once
real credentials exist is: exchange the `code` at the provider's token
endpoint, encrypt via `lib/integrations/token-store.ts`, upsert into
`integration_tokens`. Until then, every method beyond `connect()` reports
itself unconfigured.

## Sync + matching engine (built, tested against a mock provider)

`lib/sync.ts` — `syncSocialAccount` / `syncContentMetrics` /
`syncCreatorContent` / `syncCampaignContent`. Every run writes an
`integration_sync_logs` row; a metric sync always inserts a **new**
`content_metrics` snapshot (source `api`), never overwriting the last
one. Discovered posts are matched via `lib/content-matching.ts`'s
five-tier hierarchy (`platform_post_id` → exact URL → account + single
open deliverable → campaign date window → manual) — an ambiguous or
unmatched post is written to `discovered_content` for human review, never
auto-assigned.

## Per-platform requirements

| Platform | Requires | Known limitations |
|---|---|---|
| **Instagram / Meta** | Meta developer app, Instagram professional (business/creator) account, Graph API permissions requiring app review (`instagram_basic`, `instagram_manage_insights`, etc.) | Insights API generally only returns metrics for content published *through* a connected business account, or requires the creator to grant access — can't pull metrics for arbitrary public posts. Stories expire after 24h and have no durable API-queryable metrics after that, which is why Story evidence/metrics stay manual-first by design. |
| **TikTok** | TikTok for Developers app, approval for Content Posting / Display API scopes | Metrics API access is tightly scoped to content posted by the connected account; third-party post metrics generally aren't available. |
| **X** | X API app with elevated/paid access tier for metrics endpoints, OAuth 2.0 + PKCE | Free tier does not include the metrics endpoints needed here. |
| **YouTube** | Google Cloud project, YouTube Data API v3 enabled, OAuth consent screen | Public video statistics (views/likes/comments) are available without the channel owner's consent; watch time / audience retention require the channel owner to authorize. |
| **Google Drive** | Separate Google Cloud OAuth client (own `GOOGLE_DRIVE_*` credentials, `drive.file` scope) | Story evidence only — falls back to Supabase Storage automatically when not connected; campaign execution never blocks on it. |

## Scheduled sync (Phase 7+)

Spec section 19 explicitly doesn't require background jobs where the
hosting environment doesn't support them yet — this app has no cron
infrastructure, so sync is manual-trigger only today (`/settings/integrations`'s
"Sync now" / "Sync all connected accounts", and each campaign's
"Sync now"). `app_settings.sync_frequency_hours` is read by
`getCampaignAutomationSummary` to compute an informational "next sync
would be due" timestamp, but nothing actually schedules that run. Wiring
a real cron (e.g. a Vercel Cron Job or Supabase Edge Function calling
`syncCampaignContent` per active campaign) is the natural Phase 7 task.
