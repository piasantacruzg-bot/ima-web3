# Phase 6 summary

Integrations, Social APIs, Google Drive & Campaign Automation, per the
detailed Phase 6 brief. Extends Phase 5's execution model
(deliverables/story_instances/content_posts/content_metrics/content_evidence)
and Phase 1's `social_accounts` (oauth_status/access_token_reference/
last_synced_at etc. already existed there — Phase 6 never created a
second creator identity or connection-status system). No live social API
or Google Drive credentials exist in this environment; every adapter,
sync run, and automation check is real, tested production code — it
simply has nothing to call yet. Nothing here scrapes a platform, fakes
API data, or fabricates a metric to make a dashboard look complete.

## Implemented

- **Integration Center** (`/settings/integrations` + `/settings/integrations/google-drive`):
  real per-platform status (Connected/Not Connected/Needs Reauthorization/
  Error/Partially Available), connected accounts, last sync, permissions,
  connection owner, and sync error counts — all computed from
  `social_accounts`/`integration_tokens`/`integration_sync_logs`, nothing
  hardcoded.
- **Social account connection architecture**: unchanged identity model —
  `social_accounts` stays the one source of truth, keyed to `creator_id`.
- **OAuth architecture**: a real, correctly-formed authorize URL per
  provider (Instagram via Facebook Graph, TikTok with `client_key`, X
  with OAuth 2.0 + PKCE, YouTube/Google Drive via standard Google OAuth),
  using this project's existing env var names (`META_APP_ID`,
  `TIKTOK_CLIENT_KEY`, etc. — not the brief's generic suggestions, per its
  own instruction to prefer the project's actual conventions). Tokens are
  stored encrypted (AES-256-GCM, server-only key) — never in plaintext,
  never in the browser, never logged. The callback/token-exchange step is
  intentionally not implemented (see Known limitations).
- **Instagram / TikTok / X / YouTube adapters**: each in its own
  `lib/integrations/<provider>/` folder, implementing the shared
  `SocialPlatformAdapter` interface (connect/disconnect/getAccount/
  getPosts/getPost/getPostMetrics/syncPost/syncAccount). Every method
  beyond `connect()` reports itself unconfigured rather than returning
  fabricated data.
- **Google Drive integration architecture**: real OAuth URL builder,
  configurable (not hardcoded) folder-path builder (`Creator Campaign OS /
  Client / Campaign / Creator / Stories`), and the existing
  `content_evidence` Drive columns from Phase 5.
- **Story evidence upload**: unchanged from Phase 5 (Supabase Storage
  fallback already built); Drive connection now has a real settings page.
- **Content auto-matching**: `lib/content-matching.ts`'s five-tier
  hierarchy (platform_post_id → exact URL → account + single open
  deliverable → campaign date window → manual) — an ambiguous or
  unmatched post is written to `discovered_content` and reviewed at
  `/content/matches` or `/content/import`, never auto-assigned.
- **Social content sync**: `lib/sync.ts` — `syncSocialAccount`,
  `syncContentMetrics`, `syncCreatorContent`, `syncCampaignContent`.
  Idempotent via a `(platform, platform_post_id)` unique index.
- **Metric synchronization + historical snapshots**: every sync inserts
  a **new** `content_metrics` row (never overwrites); a manual fallback
  is always available.
- **Metric conflict handling**: `lib/metric-conflicts.ts` detects a
  real (>5%) gap between the latest API and manual values and surfaces a
  source-priority preferred value — never silently overwrites, never
  deletes the lower-priority snapshot. `resolveMetricConflict` records
  the human decision via the audit log.
- **Sync logs**: `integration_sync_logs`, one row per run, with
  started/completed/status/records_found/created/updated/skipped/failed.
- **Metric freshness**: `lib/freshness.ts`, configurable thresholds
  (default 0-24h fresh / 24-72h needs update / 72h+ stale).
- **Notifications + automation rules**: `automation_rules` (four fixed,
  deterministic, toggleable rules) and `lib/automation.ts` writing
  de-duplicated notifications for overdue deliverables, missing metrics,
  missing Story evidence, and expired connections.
- **Campaign health**: `lib/campaign-health.ts` — Execution/Content/
  Metrics/Evidence sub-scores plus one overall %, shown on the campaign
  dashboard alongside a new Automation section (last/next sync, connected
  platforms, content discovered, metrics updated, sync errors, "Sync
  now").
- **Integration health on the dashboard**: metrics awaiting collection,
  evidence missing, sync errors, and a per-platform status list.
- **Data source transparency**: creator profile per-account API/last
  sync/content-sync status; deliverable detail page's new "API status"
  block (metrics source/sync status/last sync).
- **Global search**: extended to campaigns, creators, deliverables,
  content posts, social usernames, and content URLs/platform post IDs,
  via a new `/search` page.
- **Bulk sync**: "Sync all connected accounts" on the Integration Center.
- **Audit logging**: new action types (`content_matched`,
  `metrics_synced`, `metric_conflict_resolved`, `content_unlinked`,
  `api_disconnected`, `automation_executed`, …) via the existing
  `lib/audit.ts`.
- **Tests**: 74 new unit tests across OAuth/adapters, token encryption,
  content matching, metric conflicts, automation rules, campaign health,
  freshness, and integration status.

## Routes created/modified

- `/settings/integrations`, `/settings/integrations/google-drive` (new;
  replaces the old `/integrations` placeholder — sidebar updated).
- `/content/matches`, `/content/import`, `/evidence`, `/search` (new).
- `/api/integrations/{instagram,tiktok,x,youtube,google-drive}/connect` (new).
- `/` (dashboard): Integration Health section.
- `/campaigns/[id]`: Automation section + Sync now.
- `/campaigns/[id]/content/[deliverableId]`: API status block.
- `/creators/[id]`: richer per-account status via `SocialAccountCard`.
- `/content`: links to Matches/Import/Evidence review queues.

## Tables/migrations

- `20260915090000_integrations_automation.sql`: `integration_tokens`,
  `integration_sync_logs`, `automation_rules` (+4 seeded rules),
  `notifications` extended (campaign_id/creator_id/deliverable_id/
  content_post_id), `content_posts.content_status`/
  `unavailable_detected_at`, `(platform, platform_post_id)` unique index.
- `20260916090000_discovered_content.sql`: `discovered_content` (holds a
  post between a sync and a human decision).
- Both validated against a fresh local Postgres 16 instance (full
  migration chain + `seed.sql`) and confirmed idempotent on re-run.

## Services

- `lib/integrations/social-platform-adapter.ts` (shared interface),
  `lib/integrations/{instagram,tiktok,x,youtube,google-drive,mock,facebook-other-adapter}`,
  `lib/integrations/registry.ts`, `lib/integrations/token-store.ts`.
- `lib/sync.ts`, `lib/content-matching.ts`, `lib/metric-conflicts.ts`,
  `lib/automation/rules.ts` + `lib/automation.ts`, `lib/campaign-health.ts`,
  `lib/freshness.ts`, `lib/integrations-status.ts`,
  `lib/discovered-content.ts`, `lib/global-search.ts`.

## Tests

309 tests passing (26 files), up from 235 at the start of this phase:
`integrations-oauth` (13), `token-store` (5), `content-matching` (9),
`metric-conflicts` (13), `automation-rules` (13), `campaign-health` (6),
`freshness` (9), `integrations-status` (6) — all new — plus every
existing Phase 1-5 test still passing. Clean `tsc --noEmit`, `eslint .`,
`npm run build`.

**Acceptance test** — re-validated both new migrations end-to-end
against a local Postgres instance (fresh `auth`/`storage` stub, all 23
migrations, then `seed.sql`), confirmed the expanded "Luxury Miami
Launch" scenario now has exactly 70 independently-trackable items (10
Reels + 30 Story instances + 10 TikToks + 20 X Posts across the 10
creators), then ran the real production code — `MockSocialPlatformAdapter`,
`matchDiscoveredPost`, `findMetricConflicts`/`getPreferredValue`,
`isDeliverableOverdue`/`isMetricsMissing`/`isEvidenceMissing`/
`isConnectionExpired`, `computeCampaignHealth`, `computeFreshness`,
`summarizePlatformStatus`, and `getTrackerItems`/`getCampaignAggregateMetrics`/
`getCreatorPerformanceRows`/`getCampaignReadiness` — against that live
data. All 24 assertions passed: the mock adapter connects and discovers
content; the matcher confidently resolves an open deliverable; a second
sync with different values adds a new snapshot rather than overwriting
the first; the platform_post_id unique index blocks a duplicate; all 3
Story instances have independent evidence and distinct metrics; a Story
with no public URL still reads "complete"; a real API/manual conflict is
detected without deleting either snapshot; missing-metrics/missing-evidence/
overdue flags fire correctly; and creator-level totals sum exactly to the
campaign total.

## Known limitations

- **No real OAuth callback/token exchange** — `connect()` builds a real
  authorize URL once env vars are set, but the callback endpoint that
  would exchange a `code` for a token isn't implemented, since it can't
  be verified without a live registered app per provider. Wiring it is:
  exchange the code at the provider's token endpoint, encrypt via
  `lib/integrations/token-store.ts`, upsert into `integration_tokens`.
- **No scheduled/background sync** — by design (spec explicitly allows
  this where no cron infrastructure exists). Sync is manual-trigger only
  (`Sync now` / `Sync all connected accounts`); `app_settings.sync_frequency_hours`
  only powers an informational "next sync would be due" timestamp.
- **Bulk sync is account-level, not row-level** — "Sync all connected
  accounts" and per-campaign "Sync now" exist; a multi-select "sync these
  specific rows" UI on the Content Tracker doesn't.
- **Story instances don't get their own "API status" block** — they have
  no `content_posts` row (no durable API-queryable metrics after 24h),
  so the API-status UI only applies to non-Story deliverables.
- **`/content/import`'s manual-assignment picker lists every open
  deliverable for the creator+platform**, not a full campaign/creator
  re-assignment flow — sufficient for the spec's "assign to Campaign/
  Creator/Deliverable" case where the creator is already known from the
  synced account.
- **Deleted-content detection (`content_status = unavailable`) has the
  column and type but no adapter call sets it yet** — no live API to
  report a 404 from.

## API limitations

- **Instagram**: Insights API only returns metrics for content published
  through a connected business account; Stories have no durable
  API-queryable metrics after 24h (manual-first by design).
- **TikTok**: metrics API access is scoped to the connected account's own
  content; no third-party post lookup.
- **X**: the metrics endpoints this app needs require a paid API tier.
- **YouTube**: public statistics don't need consent; watch time/audience
  retention do.
- **Google Drive**: evidence-storage use case only; always falls back to
  Supabase Storage when not connected.

## Recommended Phase 7

Real OAuth callback/token-exchange endpoints once live app credentials
exist for each provider; scheduled sync (a Vercel Cron Job or Supabase
Edge Function calling `syncCampaignContent` per active campaign on
`app_settings.sync_frequency_hours`); notification delivery (email/
in-app) on top of the schema-only `notifications` table; a row-level bulk
sync UI on the Content Tracker; deleted-content detection once a real
adapter can report a 404. Do not start Phase 7 without explicit
confirmation.
