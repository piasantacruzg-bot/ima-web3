# Phase 4 summary

Campaign Management System + the first version of Intelligent Creator
Selection, per the detailed Phase 4 brief. Built on Phase 1's existing
`campaigns` / `campaign_creators` / `deliverables` tables (extended, not
replaced) and Phase 2's creator database, categories, and status system.
Social API integrations, automated reporting, and AI-assisted briefs are
explicitly **not** built — those are future phases.

## What was built

**Campaigns list (`/campaigns`)** — search, status filter, sort, pagination,
archive/restore, and a duplicate action (with an explicit "duplicate with
creators" choice, off by default per spec section 32). Each row shows
client/brand, status, dates, budget, creator counts (selected/total), and
deliverable count.

**Create Campaign wizard (`/campaigns/new`, reused for `/campaigns/[id]/edit`)**
— 8 steps: Basics, Objectives, Audience & Market, Creator Requirements,
Deliverables, Budget, Creator Selection, Review & Create. The campaign
persists as a draft the moment the wizard needs a real database row (the
Deliverables step, since deliverable templates are foreign-keyed to a
campaign) — so "Save as draft & exit" is available from the very first
step, and reaching Deliverables never loses work.

**Campaign dashboard (`/campaigns/[id]`)** — overview (client, brand,
objective, dates, market, budget, status), estimated reach clearly labeled
as **estimated** (computed from selected creators' real social stats, never
fabricated) with an explicit note that actual campaign performance isn't
available yet, a lightweight timeline (start date, upcoming deliverable due
dates, end date), and budget/deliverable/creator-count stat cards.

**Creator Selection Workspace (`/campaigns/[id]/creators`)** — four tabs
(Recommended / Shortlisted / Selected / Rejected), card and table view
toggle, per-card match score + explanation, Shortlist/Select/Reject/Remove
actions, inline proposed-fee entry, a Compare drawer (2-5 creators,
side-by-side metrics with the best value highlighted per row), and
CSV/XLSX shortlist export.

**Campaign-creator detail (`/campaigns/[id]/creators/[creatorId]`)** —
creator summary, social accounts, match score + full explanation, this
campaign's deliverables, the creator's history in *other* campaigns, and an
editor for campaign-specific fields (pipeline status, fees, notes) that
never touches the creator's own record — with the creator's permanent
internal notes shown separately and clearly labeled, exactly the
distinction spec section 30 asks for.

**Deliverable auto-assignment** — selecting a creator generates their
deliverables from the campaign's deliverable templates automatically (one
deliverable per template, skipping any template already assigned so
re-selecting is a no-op, never a duplicate).

## Campaign architecture

```
CREATOR DATABASE (unchanged, master record)
      ↓ referenced by creator_id, never duplicated
CAMPAIGN (campaigns table — requirements, budget, weights)
      ↓
CREATOR MATCHING (lib/campaigns/matching-service.ts — pure, deterministic)
      ↓ produces a live-computed "Recommended" list (not stored)
campaign_creators (join table — the actual relationship + decision)
      ↓ selection_status: shortlisted → selected → rejected
DELIVERABLES (generated from campaign_deliverable_templates on selection)
      ↓
BUDGET (lib/campaigns/budget.ts — computed from campaign_creators fees)
```

A creator is only ever referenced by `creator_id`; nothing in Phase 4 ever
writes to the `creators` table itself.

## Database changes

One migration, `20260910090000_campaign_builder.sql`, explained before
being applied and validated twice against a clean local Postgres 16
instance (full 20-file migration chain + `seed.sql`, from scratch):

- **`campaign_creators`**: extends the existing pipeline `status` enum
  (adds `declined`, `not_available`) rather than replacing it, and adds a
  *separate*, deliberately small `selection_status` enum
  (`shortlisted` | `selected` | `rejected`). Design decision: **"Recommended"
  is never a stored value** — a recommended creator has no
  `campaign_creators` row at all until a human acts on them. The
  live-computed recommendation and the persisted decision are different
  things on purpose; conflating them would mean either fabricating rows
  for every match candidate or losing the distinction between "the
  algorithm suggested this" and "someone decided this." Also adds
  `match_breakdown` (structured per-criterion scores), `proposed_fee`,
  `currency`, `fee_type`, `selected_at`, `removed_at`.
- **`campaigns`**: adds budget breakdown (`creator_budget`,
  `production_budget`, `paid_media_budget`, `agency_fee`, `other_budget`),
  `matching_weights` (per-campaign scoring overrides), `owner_id`,
  structured `primary_objective`/`secondary_objectives` (the existing
  `campaign_objectives` free-text field becomes "objective notes"),
  `language`, campaign-specific exclusions (`excluded_creator_ids`,
  `excluded_categories`, `excluded_locations` — never written back to the
  creator database), and `archived_at` (same reversible pattern as
  creators).
- **New table `campaign_deliverable_templates`**: what a campaign expects
  from *any* selected creator, before any creator is selected.
- **New table `campaign_templates`**: reusable campaign blueprints
  (schema + two seeded examples; see Known limitations for UI scope).
- **`deliverables`** gains `template_id`, tracing an auto-generated
  deliverable back to its template.

**Reuse, not duplication:** `CreatorRequirements` and `TargetAudience`
(both already existed as Phase 1 JSONB types) were extended with new
optional fields rather than replaced — no new requirements table was
needed. The candidate-pool query and social-stat aggregation reuse the
same `social_accounts` table Phase 1/2 built, computed fresh (see Matching
algorithm) rather than through the `creators_with_stats` view, for a
correctness reason explained below.

## Campaign creation workflow

Basics → Objectives → Audience & Market → Creator Requirements →
Deliverables → Budget → Creator Selection → Review & Create, exactly as
suggested. The campaign is saved (as a draft) the first time a step needs
a real campaign id; every subsequent "Continue" re-saves it, so the wizard
can be abandoned at any point without losing anything already entered
past that point.

## Creator selection workflow

Database → Recommended (live-computed, never stored) → Shortlist →
Selected, with the human decision always final: nothing is ever
auto-selected, and every recommendation can be overridden (shortlist a
"partial" match, reject a 94-score creator, reconsider a rejected one).
Removing a creator from a campaign never deletes the creator or their
deliverable history — it sets `removed_at` and clears `selection_status`.

## Matching algorithm

`creatorMatchingService` (`lib/campaigns/matching-service.ts`, spec
section 38's named service) is pure, synchronous, and takes no AI/LLM
input — identical inputs always produce an identical score (tested
explicitly). It runs in two passes to stay fast at scale (spec section
41): SQL-level hard filters narrow the creator pool first (status,
location, category), and only the surviving candidates get scored.

**A correctness fix along the way:** the existing `creators_with_stats`
view (built for the Creators table in Phase 2) `coalesce`s a creator's
missing follower/engagement/view figures to `0` — reasonable for a list
column, but wrong for matching, since it would make "no data recorded"
indistinguishable from "confirmed zero" and silently fail every
minimum-followers check for a creator who simply hasn't been enriched yet.
Phase 4 queries `social_accounts` directly instead
(`getSocialStatsForCreators` in `lib/campaigns.ts`), so a creator with no
social accounts on record comes back as `null` (unknown), not `0`.

## Match scoring weights

Default weights (section 15, sum to 100, exported as
`DEFAULT_MATCHING_WEIGHTS`):

| Criterion | Weight |
|---|---|
| Platform | 15% |
| Category | 15% |
| Engagement | 15% |
| Location | 10% |
| Followers | 10% |
| Average views | 10% |
| Brand fit | 10% |
| Internal rating | 5% |
| Historical performance | 5% |
| Cost efficiency | 5% |

Stored per-campaign in `campaigns.matching_weights` (empty object = use
system defaults); any subset of criteria can be overridden without
affecting other campaigns.

## Hard vs soft requirements

Exactly the six from spec section 14, and only those six can lower a
creator's eligibility tier:

- **Hard**: required platform (any one of the campaign's listed platforms
  is enough — requiring every creator to be on every platform would be
  unusually strict), required category, location, creator status (default
  allowlist `approved`/`active`; `do_not_work_with` is reachable only via
  an explicit override, never by default), minimum followers, minimum
  engagement rate.
- **Soft** (ranking-only, never gates eligibility): brand fit, internal
  rating, average views (including *maximum* followers/engagement, which
  the spec lists only under soft), historical campaign performance, cost
  efficiency.

Eligibility: 0 hard-requirement failures → **eligible**; exactly 1 →
**partial** (shown, flagged, not hidden — the spec's Miami/Lima worked
example is a direct unit test); 2 or more → **ineligible** (excluded from
the auto-generated Recommended list, but never deleted or hidden from the
underlying data — a manager can still find and add such a creator
manually).

**Missing data** (spec section 40) is never treated as zero or as a
confirmed failure: a creator with no recorded followers gets a neutral
score and a "not available" concern, and a still-*required* threshold that
can't be confirmed becomes an "unknown, cannot confirm" hard-requirement
note rather than an assumed pass or fail. A creator with no campaign
history gets "Insufficient historical data," never "poor performance."

## Match explanations

Every score carries `strengths[]`, `concerns[]`, and (when applicable)
`hardRequirementFailures[]` — plain-language reasons, not a bare number.
The creator card and detail page both render these directly; nothing about
a score is hidden behind an opaque "94."

## Budget management

`calculateCampaignBudget` (`lib/campaigns/budget.ts`) computes: total
allocated (sum of the five sub-budgets) vs. the overall campaign budget;
estimated creator spend (shortlisted + selected creators, using whichever
fee is most confirmed: approved → negotiated → proposed) vs. the creator
budget, with the exact section-24 worked example ($25,000 / $18,000 /
$15,500 / $2,500 remaining) as a unit test; and a currency-mismatch
warning when committed creators aren't priced in the same currency — never
an automatic conversion. Warnings surface, never block: a manager can
still select a creator whose fee exceeds the remaining budget.

## Deliverable management

Deliverable *templates* (platform, content type, quantity, due date,
instructions, usage rights, paid-media rights, exclusivity, approval
requirement) live on the campaign before any creator is selected.
Selecting a creator turns every template into a real, creator-specific
`deliverables` row in one pass; re-selecting (or re-running the action) is
idempotent because already-assigned templates are skipped.

## Files/components created

- `supabase/migrations/20260910090000_campaign_builder.sql`
- `lib/campaigns/matching-service.ts`, `lib/campaigns/budget.ts`
- `lib/campaigns.ts`, `lib/campaign-sort-options.ts`, `lib/audit.ts`
  (shared audit-log writer, used by the new campaign actions)
- `lib/validation/campaign.ts`
- `app/(app)/campaigns/actions.ts`
- `app/(app)/campaigns/new/page.tsx`, `app/(app)/campaigns/[id]/page.tsx`,
  `app/(app)/campaigns/[id]/edit/page.tsx`,
  `app/(app)/campaigns/[id]/creators/page.tsx`,
  `app/(app)/campaigns/[id]/creators/[creatorId]/page.tsx`
- `app/api/campaigns/[id]/creators/export/route.ts`
- `components/campaigns/campaign-wizard.tsx`,
  `campaign-filters.tsx`, `campaign-row-actions.tsx`, `creator-card.tsx`,
  `creator-card-data.ts`, `creator-selection-workspace.tsx`,
  `campaign-creator-editor.tsx`
- `components/platform-icon.tsx` (extracted from `social-account-card.tsx`
  so both Phase 2's creator cards and Phase 4's campaign creator cards
  share one platform-icon map)
- `tests/matching-service.test.ts`, `tests/budget.test.ts`

**Modified:** `types/database.ts` (Phase 4 schema additions),
`app/(app)/campaigns/page.tsx` (real campaign list, was a placeholder),
`components/creators/social-account-card.tsx` (now imports the shared
platform-icon map), `supabase/seed.sql` (5 deliverable templates on 2
existing demo campaigns, 2 reusable campaign templates).

## Tests created

40 new Vitest assertions, both pure-logic/no-database (same constraint as
prior phases — this sandbox has no network path to a live Supabase
project): `matching-service.test.ts` (26 — the section-16 worked example,
every hard requirement individually, soft requirements never gating
eligibility, every missing-data edge case from section 40, historical
performance, cost efficiency, configurable weights, determinism) and
`budget.test.ts` (14 — the section-24 worked example, allocation math,
creator-spend fallback ordering, currency-mismatch detection).

Beyond unit tests, the full **Phase 4 acceptance scenario** (spec section
43, "Luxury Miami Launch") was run end-to-end against the real seeded
Postgres database using the actual `creatorMatchingService` and
`calculateCampaignBudget` code (imported directly, not reimplemented for
the test): hard-filtered the real creator pool down to 8 Miami
Fashion/Lifestyle candidates, scored and explained all of them, correctly
excluded 1 as ineligible (wrong location *and* below minimum engagement,
with the reason shown), selected the top 3, auto-assigned deliverables
from a template (3 created, 3 expected), computed estimated spend ($5,100)
against an $20,000 creator budget with no false warning, and confirmed the
34-row master creator table was untouched throughout.

## Tests passed

`npm run lint` — clean. `npm run typecheck` — clean. `npm test` — 170/170
passing (130 from Phases 1-3 unaffected, 40 new). `npm run build` —
succeeds, all campaign routes present. The full 20-migration chain plus
`seed.sql` re-applied cleanly against a clean local Postgres 16 instance
twice. Existing Creator Database, Creator Profiles, and Import flows were
re-verified via their own still-passing test suites and the successful
production build — nothing in Phase 4 touches their code paths.

## Known limitations

- **Campaign templates have schema but no dedicated UI** — "Create
  Campaign from Template" isn't wired into the wizard; `campaign_templates`
  exists with two seeded examples and duplicating an existing campaign
  (which *is* fully wired) covers the same need in the meantime.
- **No creator-exclusion picker in the wizard** — excluding specific
  creators by category or location is a text field in the Requirements
  step; excluding a specific *creator* by name has no dedicated UI yet
  (rejecting them from the Selection Workspace is the practical
  equivalent and is fully wired).
- **Match cards don't show a creator photo** — avatar resolution
  (Phase 2's signed-URL pattern) wasn't plumbed through the matching
  pipeline to keep this phase's scope bounded; cards show an initial
  instead.
- **The "Add to Campaign" action (no shortlist/select/reject decision)
  exists at the schema/action level but has no dedicated button** — the
  workspace only exposes Shortlist/Select/Reject, which cover the
  practical workflow; a bare "add without deciding" was left out as an
  extra state without a clear use case yet.
- **AI-ready campaign brief parsing was not built** — scoped in the brief
  as architecture-only ("do not implement an LLM integration yet"); the
  structured `creator_requirements`/`target_platforms`/`budget` fields
  already exist and are exactly what a future brief-parser would populate,
  so no additional schema work was needed.
- **10,000-creator matching scale wasn't re-tested for Phase 4** — Phase
  3's scale test already validated the shared indexing/blocking approach
  at that size for a similar deterministic-matching problem; Phase 4's
  candidate-pool query (hard SQL filters before scoring, per section 41)
  is architecturally the same shape but wasn't independently
  load-tested here.

## Recommended Phase 5

Actual campaign performance tracking: real posted-content metrics
(`content_posts`/`content_metrics`, already scaffolded in Phase 1) feeding
back into `creator_performance_snapshots` — turning this phase's
"Estimated" dashboard numbers into real "Actual" ones, and giving the
matching engine's `historicalPerformance` and `costEfficiency` criteria
real data to work with instead of "insufficient data" for every
first-time creator.

---

Per the brief: stopping here. Phase 5 has not been started.
