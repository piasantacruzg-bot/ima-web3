# Database

PostgreSQL via Supabase. Schema lives entirely in
`supabase/migrations/*.sql`, applied in filename order. Demo data is in
`supabase/seed.sql`.

## Applying migrations

Against a real Supabase project:

```bash
# Using the Supabase CLI (recommended)
supabase link --project-ref <your-project-ref>
supabase db push

# Or: paste each file from supabase/migrations/, in order, into the
# Supabase Dashboard's SQL editor.
```

Then, optionally, run `supabase/seed.sql` the same way to get 20 demo
creators, 35 social accounts, 5 campaigns, deliverables, content, and
metrics history to develop and demo against.

## Core tables

| Table | Purpose |
|---|---|
| `profiles` | 1:1 with `auth.users`; carries `role` (admin/manager/member). Auto-created on signup. |
| `creators` | The single source of truth for a creator (rule: a creator exists once). |
| `social_accounts` | 1 creator → many social accounts. `access_token_reference` is an opaque pointer — real OAuth tokens are never stored in this table (see `API_INTEGRATIONS.md`). |
| `creator_performance_snapshots` | Historical performance rollups tied to a creator/campaign/content — never overwritten. |
| `campaigns` | Campaign header info, JSONB `target_audience` / `creator_requirements`. |
| `campaign_creators` | Join table: 1 creator → many campaigns, with per-campaign status/fee/payment/contract/briefing tracking. |
| `deliverables` | What's owed per creator per campaign (content type, quantity, due date, status). |
| `content_posts` | A tracked post URL, tied to a campaign + creator (+ optionally a deliverable and social account). `collection_method` is always honest (`api` / `url_import` / `manual` / `screenshot`). |
| `content_metrics` | Append-only metrics history per content post — a new row per capture, never an overwrite. `source` distinguishes `api` / `manual` / `screenshot` / `imported` / `url`. |
| `story_metrics` | Manual story tracking (screenshot + views/reach/replies/link clicks/sticker taps/exits). |
| `import_batches` / `import_rows` | CSV/XLSX import pipeline state; `raw_data` on each row is preserved forever even after normalization. |
| `audit_log` | User/action/entity/before/after log. |
| `app_settings` / `creator_scoring_weights` | Singleton config rows (`id = 1`), enforced via `check (id = 1)`. |

Two views: `deliverables_with_computed_status` (adds a computed "late"
status without a stored flag) and `content_metrics_latest` (most recent
metrics row per content post).

## Enums

All controlled vocabularies from the spec are Postgres enums (`creator_type`,
`creator_status`, `social_platform`, `campaign_status`,
`campaign_creator_status`, `deliverable_status`, `metric_source`, etc.) —
see `supabase/migrations/20260904134301_extensions_and_enums.sql` for the
full list. `types/database.ts` mirrors every enum as a TypeScript union.

## Row Level Security

Every table has RLS enabled (`supabase/migrations/..._row_level_security.sql`).
This is an internal-only tool — there is no anonymous access anywhere.
Within an authenticated session:

- **admin** — full access, including deletes and settings.
- **manager** — can create/edit creators, campaigns, deliverables, run
  imports; cannot delete or touch settings.
- **member** — read everything; can do day-to-day tracking (deliverable
  status, content URLs, metrics, stories) but can't create creators or
  campaigns.

Role is read via `current_user_role()` / `is_staff()` / `is_manager_or_admin()`
/ `is_admin()` SQL helper functions (`security definer`, so they can read
`profiles` regardless of the caller's own RLS visibility into that table).

`content_metrics` has **no update policy** — corrections are new rows, not
edits, so historical readings are never silently changed (spec rule: don't
destroy historical metrics).

## Storage buckets

`creator-avatars`, `story-screenshots`, `import-uploads` — all private,
RLS-gated the same way as the tables (see
`supabase/migrations/..._storage_buckets.sql`). Files are served via
signed URLs generated server-side; nothing is public.

## Regenerating TypeScript types

`types/database.ts` is hand-written (matches the migrations) rather than
generated, so Phase 1 doesn't depend on a linked Supabase project. Once one
exists, you can switch to generated types:

```bash
supabase gen types typescript --project-id <ref> > types/database.ts
```

If you do, keep the table interfaces as `type` aliases, not `interface`s —
see the `@supabase/ssr` version note in `ARCHITECTURE.md`: `interface`
declarations don't satisfy postgrest-js's `Record<string, unknown>`
structural check the way `type` object literals do, which silently
collapses every query's row type to `never`.
