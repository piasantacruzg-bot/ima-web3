# Phase 5 summary

Campaign Execution, Deliverables, Content Tracker, Evidence & Metrics, per
the detailed Phase 5 brief. Built on Phase 4's existing `campaigns` /
`campaign_creators` / `deliverables` tables (extended, not replaced) and
generalizes Phase 1's `content_posts` / `content_metrics` / `story_metrics`
into a normalized structure that supports the brief's non-negotiable core
rule: **every deliverable, and every individual Story instance, is
independently trackable with its own status, evidence, and metric
history — campaign and creator totals are always computed from that
granular data, never stored as a separate figure.** Social API
integrations, Google Drive OAuth, and delivery-integrated notifications are
explicitly **not** built — interfaces exist so a real integration can be
connected later (see Known limitations), but nothing here fakes one.

## Implemented

- **Execution hierarchy**: CAMPAIGN → CREATOR → DELIVERABLE → STORY
  INSTANCE / CONTENT POST → EVIDENCE → METRIC SNAPSHOTS. A Story
  deliverable with quantity 3 is backed by exactly 3 `story_instances`
  rows, each with its own status, evidence, and metric history — never one
  shared record standing in for the batch.
- **Metrics are append-only**: every capture is a new `content_metrics`
  row keyed by `captured_at`. Nothing is ever updated in place, so a
  second snapshot never overwrites the first and full history is always
  visible.
- **Strict metric separation**: views, reach, impressions, likes,
  comments, shares, reposts, and saves are distinct columns, never
  combined. A metric snapshot belongs to exactly one most-granular parent
  (content post, Story instance, or deliverable) — enforced by a database
  CHECK constraint, not just application code.
- **Missing vs. zero**: every aggregation primitive (`sumMetrics`,
  `calculateEngagements`) tracks whether *any* input actually had a value
  and returns `null` — rendered in the UI as "Not available" — rather than
  a false `0`, while still summing genuine zeros correctly.
- **Configurable engagement rate**: `calculateEngagementRate` tries
  reach → impressions → followers in order and only returns a rate when a
  real denominator exists, storing which method was used
  (`engagement_rate_method`) rather than silently mixing denominators.
- **Content workflow state machine**: `not_started → assigned → brief →
  draft → submitted → in_review → needs_revision → approved → scheduled →
  published → metrics_collected`, with `cancelled` reachable from most
  states. Invalid jumps are rejected unless explicitly overridden (and an
  override is recorded as such in the audit log).
- **Evidence system**: `content_evidence` supports public URLs,
  screenshots, uploaded files (real Supabase Storage upload wired up, to a
  private `content-evidence` bucket), and Google Drive metadata fields —
  architecture only, no live Drive auth. A Story is never marked
  incomplete for lacking a public URL as long as it has evidence and
  metrics.
- **Draft/review versioning**: `content_submissions` numbers every
  version per deliverable and never deletes an old one; a review decision
  (approve / request revision) is logged and moves the deliverable's
  status.
- **Content Tracker** at both `/content` (global) and
  `/campaigns/[id]/content` (per-campaign): table and Kanban views, and
  filters for platform, status, Stories-only, needs-review,
  missing-metrics, missing-evidence, and missing-URL.
- **Deliverable detail pages** (`/campaigns/[id]/content/[deliverableId]`)
  with Story-specific rendering: each instance shown individually (status
  control, evidence, own metric history) plus a clearly-labeled "computed
  totals" block, versus a single content-post view for everything else.
- **Campaign dashboard updates**: an Execution/readiness section (with
  named blockers), a Performance section (real captured metrics, computed,
  never a placeholder), a Creator Performance table, a Deliverable
  Performance table (every item shown individually), and a Recent Activity
  feed reusing the existing `audit_log`.
- **Campaign report** (`/campaigns/[id]/report`) with 9 named sections:
  Overview, Campaign performance, Creator performance, Deliverable
  performance (every item individually, never collapsed), Platform
  breakdown, Story evidence, Evidence completeness, Metrics completeness,
  and Report readiness with named blockers.
- **`SocialPlatformAdapter` and `GoogleDriveAdapter` interfaces**
  (`lib/integrations/`) defining the shape a real integration will fill in
  during Phase 6. The only implementation today reports itself
  unconfigured for every method — it never fabricates an API response or
  scrapes a platform — so manual entry stays the supported fallback.
- **CSV/XLSX execution export**, both global and per-campaign, one row per
  deliverable/Story instance.
- **Metric provenance**: every snapshot records a `source`
  (api/manual/screenshot/imported/url) and an `is_estimated` flag, so an
  estimated number is never presented as verified API data.
- **Bulk status update** with a per-item validity check — an invalid
  transition on one item is skipped and reported, never silently forced
  across a batch.
- **Existing data ownership respected**: creators/social_accounts stay the
  identity source of truth; everything execution-specific lives on
  `deliverables`/`story_instances`/`content_posts`, keyed back to
  `campaign_creators`.

## Files, tables, and routes created or modified

**Schema** — `supabase/migrations/20260912100000_execution_evidence_metrics.sql`:
extends `deliverable_status` (assigned/brief/in_review/metrics_collected),
extends `deliverables` (campaign_creator_id, title, description,
usage_rights, paid_media_rights, exclusivity), adds `story_instances`,
generalizes `content_metrics` (nullable content_id + new
story_instance_id/deliverable_id parents, reposts, engagement_rate_method,
is_estimated, and Story/video-specific fields, with a one-parent CHECK
constraint), adds `content_evidence` (one-or-more-parent CHECK constraint),
`content_submissions`, and `notifications` (architecture only), plus a
private `content-evidence` storage bucket with RLS policies. A DO-block
backfills existing `story_metrics` rows into `story_instances` +
`content_metrics` without touching the legacy table.

**Types** — `types/database.ts`: new `EvidenceType`,
`SubmissionApprovalStatus`, `EngagementRateMethod` enums; extended
`DeliverableStatus`, `Deliverable`, `ContentPost`, `ContentMetrics`; new
`StoryInstance`, `ContentEvidence`, `ContentSubmission`, `Notification`
types; registered in `Database.Tables`/`Database.Views`.

**Pure logic** (all unit-tested, no DB access):
`lib/execution/workflow.ts`, `lib/execution/kpi.ts`,
`lib/execution/aggregation.ts`, `lib/execution/completeness.ts`.

**DB query layer** — `lib/execution.ts`: `getCampaignExecutionRows`,
`getAllExecutionRows`, `getDeliverableDetail`, `getTrackerItems`,
`getCampaignAggregateMetrics`, `getCreatorPerformanceRows`,
`getCampaignReadiness`.

**Server actions** — `app/(app)/content/actions.ts` (status transitions,
submissions/review, publish, evidence, metric snapshots);
`app/(app)/campaigns/actions.ts` (extended `assignDeliverablesFromTemplates`
to populate `campaign_creator_id` and auto-create `story_instances`).

**Integrations** — `lib/integrations/social-platform-adapter.ts`,
`lib/integrations/google-drive-adapter.ts`.

**UI** — `app/(app)/content/page.tsx`,
`app/(app)/campaigns/[id]/content/page.tsx`,
`app/(app)/campaigns/[id]/content/[deliverableId]/page.tsx`,
`app/(app)/campaigns/[id]/report/page.tsx`, updated
`app/(app)/campaigns/[id]/page.tsx`; `components/content/*`
(content-tracker, status-control, publish-forms, evidence-panel,
metrics-panel, submissions-panel, deliverable-performance-table,
creator-performance-table, activity-feed); `lib/content-labels.ts`,
`lib/activity.ts`, `lib/execution-export.ts`; extended `lib/format.ts`
(`formatMetric`/`formatMetricRate`/`formatDateTime`, "Not available" for
missing).

**Export routes** — `app/api/content/export/route.ts`,
`app/api/campaigns/[id]/content/export/route.ts`.

**Seed data** — `supabase/seed.sql`: "Luxury Miami Launch" campaign with
10 selected creators, and for one of them (Valentina Cruz) exactly 7
independently-trackable items (1 Reel, 3 Story instances, 1 TikTok, 2 X
Posts) each with distinct metric values, two preserved metric snapshots on
the Reel, Story evidence with no public URL, and a two-version submission
history.

## Tests

235 tests passing (18 files), up from 170 at the start of this phase:
`tests/workflow.test.ts` (22), `tests/kpi.test.ts` (17),
`tests/aggregation.test.ts` (10), `tests/completeness.test.ts` (12),
`tests/tracker.test.ts` (4, including the "Story instances stay
independent" and "zero-instance Story never vanishes" cases) — all new
this phase — plus every existing Phase 1-4 test still passing. `npx tsc
--noEmit`, `npx eslint .`, and `npm run build` are all clean.

**Acceptance test** — re-validated the migration end-to-end against a
local Postgres 16 instance (fresh stub of `auth`/`storage`, all 21
migrations in order, then `seed.sql`), then ran the real exported
functions from `lib/execution.ts` (`getTrackerItems`,
`getCampaignAggregateMetrics`, `getCreatorPerformanceRows`,
`getCampaignReadiness`) against the seeded "Luxury Miami Launch" data
fetched live via `psql`. Confirmed: `getTrackerItems` produces exactly 7
items for the one creator, each with distinct metric values; every Story
instance is `complete` despite having no public URL; Story #1 and #2's
metrics are independent (22,000 vs. 19,500 views); the Reel carries 2
preserved metric snapshots, not one overwritten row; Story
engagement_rate is `null` ("Not available"), never `0`; the campaign
total (524,300 views) and the creator total are identical and match a
hand-computed sum, since this creator is the campaign's only one with
tracked content; report readiness came back at 87% with the real, named
blocker "2 published deliverables missing evidence" (both X Posts,
deliberately left without evidence in the seed).

## Known limitations

- **No live social API or Google Drive integration** — by design this
  phase. The adapter interfaces exist and are ready to be filled in, but
  every method reports itself unconfigured today; all data entry is
  manual.
- **Non-Story quantity > 1 isn't split into separate trackable units** —
  only Story deliverables get per-instance breakdown in this schema. Two
  X Posts were modeled as two separate deliverable rows (quantity 1 each)
  rather than one deliverable with quantity 2, since the latter has no
  per-instance tracking today. If a future phase needs the same
  independent-tracking guarantee for e.g. multiple Reels in one
  deliverable, `story_instances`' pattern would need generalizing beyond
  Stories.
- **`content_metrics`/`story_metrics`/`creator_performance_snapshots`
  seed inserts aren't re-run-safe** — a pre-existing limitation from
  earlier phases (they use `on conflict do nothing` without a fixed id),
  so re-running `seed.sql` duplicates metric-snapshot rows, though every
  identity-bearing row (campaigns, deliverables, story_instances,
  evidence, submissions) stays stable. Verified by re-running seed.sql
  twice against a local database.
- **Notifications are schema-only** — a `notifications` table exists but
  nothing writes to it yet; no delivery channel (email/push/in-app toast)
  is wired up.
- **No calendar view** — the brief mentions a campaign execution calendar;
  due dates are visible in the Content Tracker's table/Kanban and the
  dashboard timeline, but there's no dedicated calendar UI.
- **Bulk metric-entry safeguard is minimal** — `bulkUpdateDeliverableStatus`
  validates each item individually and reports skips, but there's no bulk
  metric-entry action yet (metrics are always entered one snapshot at a
  time per parent), which sidesteps rather than solves the "don't
  accidentally apply one metric set to many deliverables" risk the brief
  calls out.
- **Evidence screenshot links in the demo seed have no real file behind
  them** — the seed's Story evidence rows are metadata-only (`notes`
  describing a placeholder), so there's nothing to click; real uploads
  through the app do create a real, retrievable Storage object.

## Recommended Phase 6

Per the brief's own direction: integrations and automation — real social
platform API connections (Instagram Graph API, TikTok, X, YouTube) behind
the `SocialPlatformAdapter` interface built this phase, a real Google
Drive OAuth integration behind `GoogleDriveAdapter`, notification delivery
(email/in-app) on top of the `notifications` table, a campaign execution
calendar view, and intelligent automation (e.g. auto-drafted status
reminders, or surfacing at-risk deliverables). Do not start Phase 6 without
explicit confirmation.
