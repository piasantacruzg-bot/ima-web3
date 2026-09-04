# Social platform API integrations

Status as of Phase 1: **architecture only, not yet built.** `/integrations`
in the app lists each platform as "Not connected" with what's required to
connect it — this file expands on that.

## Principle (spec rule 8 / section 51)

Official APIs are the only source for "automatic" data. If a platform's API
can't provide a metric, the field stays manually editable and the record's
`collection_method` / `source` says `manual`, `url_import`, or `screenshot`
— never `api`. The app must always be able to distinguish **automatic**
(real API data), **semi-automatic** (URL identified the content, metrics
entered by hand), and **manual** (fully hand-entered), and every metric
row carries that distinction (`content_metrics.source`,
`content_posts.collection_method`).

## Database support already in place (Phase 1)

- `social_accounts.oauth_status` (`not_connected` / `connected` / `expired`
  / `revoked` / `error`), `access_token_reference`, `token_expires_at`,
  `last_synced_at`, `sync_status`, `sync_error`.
- `content_posts.collection_method`, `sync_status`, `sync_error`,
  `last_synced_at`.
- `content_metrics.source`.
- `app_settings.sync_frequency_hours` (configurable poll interval, default
  6h — spec section 29).

**Token storage:** `access_token_reference` is an opaque pointer, not the
token itself. Real OAuth tokens belong in Supabase Vault or an external
secrets manager, resolved server-side only by privileged code using the
service-role client — never sent to the browser.

## Planned adapter interface (Phase 6)

A `SocialPlatformAdapter` interface, one implementation per platform,
living in `lib/social/`:

```ts
interface SocialPlatformAdapter {
  connect(params: OAuthCallbackParams): Promise<SocialAccount>;
  disconnect(accountId: string): Promise<void>;
  getProfile(accountId: string): Promise<PlatformProfile>;
  getPosts(accountId: string, since?: Date): Promise<PlatformPost[]>;
  getPostMetrics(postUrl: string): Promise<PlatformMetrics | "unavailable">;
  syncMetrics(accountId: string): Promise<SyncResult>;
  getAccountStatus(accountId: string): Promise<OauthStatus>;
}
```

`getPostMetrics` returning `"unavailable"` is a first-class case, not an
error — the UI falls back to "Automatic metrics unavailable. Add metrics
manually." (spec section 27), never a fabricated number.

## Per-platform requirements

| Platform | Requires | Known limitations |
|---|---|---|
| **Instagram / Meta** | Meta developer app, Instagram professional (business/creator) account, Graph API permissions requiring app review (`instagram_basic`, `instagram_manage_insights`, etc.) | Insights API generally only returns metrics for content published *through* a connected business account, or requires the creator to grant access — can't pull metrics for arbitrary public posts. Stories expire after 24h and have no durable API-queryable metrics after that, which is why `story_metrics` is a manual-entry table (spec section 14), not API-backed. |
| **TikTok** | TikTok for Developers app, approval for Content Posting / Display API scopes | Metrics API access is tightly scoped to content posted by the connected account; third-party post metrics generally aren't available. |
| **X** | X API app with elevated/paid access tier for metrics endpoints | Free tier does not include the metrics endpoints needed here. |
| **YouTube** | Google Cloud project, YouTube Data API v3 enabled, OAuth consent screen | Public video statistics (views/likes/comments) are available without the channel owner's consent; watch time / audience retention require the channel owner to authorize. |

## Scheduled sync (Phase 7)

Spec section 29: only actively-sync active campaigns' recent content, on a
configurable interval (`app_settings.sync_frequency_hours`), respecting
each platform's rate limits with retry/backoff. Not built in Phase 1 — no
cron/background job exists yet.
