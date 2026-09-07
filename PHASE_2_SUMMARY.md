# Phase 2 summary

The Creator Database + Creator Profiles module, per the detailed Phase 2
brief: search, filters, sorting, profiles, create/edit, archiving, notes,
tags, saved filters, bulk actions, export, and duplicate detection/merge.
Campaign management and social API sync are explicitly **not** built —
that's Phase 4 / Phase 6.

## What was built

**Creator database page (`/creators`)**
- Server-side pagination, search, and filtering — the browser never loads
  the whole creator table.
- Search matches display name, first/last name, email, city, country, and
  social handles (a separate lookup against `social_accounts`, since the
  aggregate view can't carry per-account usernames).
- Filters: platform, country, category, niche, tag, creator type, status,
  followers (min/max), engagement (min/max), brand fit (min/max), internal
  rating (min/max), and a "show archived" toggle. Dropdown options are
  queried from real data, never hardcoded.
- Sorting: followers, engagement, avg. views/likes/comments/shares,
  estimated reach, brand fit, internal rating, campaign count, date added,
  last updated — ascending/descending via the sort key.
- Saved filter combinations: save the current filter/sort/search state
  under a name, apply/rename/delete later (`saved_creator_filters`,
  private per user).
- Bulk actions: select rows, change status, add a tag, or archive in bulk;
  archiving asks for confirmation first.
- Export: CSV and XLSX, generated server-side from *every* creator
  matching the current filters (not just the visible page), via
  `/api/creators/export`.
- Table shows avatar, display name + primary handle, primary platform,
  location, categories, followers/engagement/avg. views, type, brand fit,
  status (with an "Archived" flag), last updated, and an edit action.
  Collapses to cards below the `md` breakpoint.

**Creator profile (`/creators/[id]`)**
- Header: photo, name, quick status-change dropdown (auto-applies),
  creator type, "Do not work with" flag, location, contact info, rating,
  brand fit; actions for Edit, Check duplicates, Archive/Restore, and a
  disabled "Add to Campaign" placeholder (tooltipped as Phase 4).
- Social accounts as cards (followers/engagement/avg. views per account,
  "Open profile" link).
- Performance section computed from the creator's own social account data
  (max followers, avg engagement, avg views, max reach) — explicitly *not*
  fabricated campaign performance; shows an honest empty state until
  campaigns exist.
- Campaign history (via `campaign_creators` → `campaigns`) — empty state
  today, structured so Phase 4 populates it without touching the creator
  table.
- Notes (`creator_notes`: body + author + timestamp) and Tags
  (`creator_tags` / `creator_tag_assignments`, create-on-assign, removable,
  filterable from the list).

**Add / Edit Creator**
- Full form: contact info, state/province, languages/categories/niches,
  type/status, rating (1–5)/brand fit (0–100), manager/agency, bio.
- Avatar upload straight to the private `creator-avatars` Storage bucket;
  the DB stores a `creator-avatars/<path>` marker, resolved to a
  short-lived signed URL at render time — never an expiring URL persisted
  to the database.
- Dynamic, repeatable social account rows: paste a profile URL (parsed
  into platform + handle) or add one manually, with full per-account
  metrics (followers, following, posts, engagement, avg. likes/comments/
  views/shares/saves, estimated reach).
- **Duplicate detection on submit**: checks exact matches (same social
  handle, same email) and potential matches (bigram name-similarity,
  optionally same city) against the live database, and shows a warning
  dialog (spec section 16) before saving — "View existing", "Keep separate
  & save", or cancel. A "Check duplicates" button on the profile re-runs
  this on demand.
- **Merge** (`/creators/merge?a=&b=`): pick the primary record, resolve
  every conflicting scalar field with a side-by-side radio choice, union
  array fields (languages/categories/niches) automatically, reassign every
  child record (social accounts, notes, tags, campaign relationships,
  performance snapshots) to the primary, and archive — never hard-delete —
  the duplicate. Logged as `creator_merged` in the audit log.
- **Archiving, not deleting**, is the default removal path
  (`creators.archived_at`); archived creators are excluded from the
  default list, restorable from their profile. Permanent delete stays
  admin-only (already RLS-enforced) and lives on the edit page as a
  separate, clearly-labeled action.

**Data layer**
- New migration (`20260904150000_creator_archive_notes_tags.sql`):
  `archived_at` + `state_province` on `creators`; `creator_notes`;
  `creator_tags` + `creator_tag_assignments`; `saved_creator_filters`; and
  an updated `creators_with_stats` view carrying tags and each creator's
  primary (highest-follower) platform/handle.
- `lib/normalize.ts`: follower-count ("85K" → 85000, "1.2M" → 1200000,
  "2,500" → 2500), engagement-rate ("4.8%" → 4.8), and handle ("@x" → "x")
  normalization — shared by manual entry now and the Phase 3 importer
  later.
- `lib/duplicate-detection.ts`: exact (handle/email) + fuzzy (bigram name
  similarity) matching against the live creator database — never invents
  matches, never auto-merges.
- Audit log coverage expanded: `creator_archived`, `creator_restored`,
  `status_changed`, `social_account_added`, `note_added`, `tag_added`,
  `tag_removed`, `creator_merged`, on top of Phase 1's
  `creator_created`/`updated`/`deleted`.
- Demo data expanded to 34 creators (30+ requirement), including 2
  intentional name/city near-duplicates and 2 creators sharing an email —
  specifically to exercise duplicate detection — plus 7 tags assigned
  across several creators and 3 sample internal notes.

## Known limitations

- **No integration/DB tests** — `tests/` covers pure logic only
  (normalization, URL parsing, zod validation, merge field-diffing) with
  Vitest; duplicate detection and every Supabase-backed action need a real
  project to exercise end-to-end (documented, not skipped silently — see
  `TESTING.md`).
- **Column visibility toggle** for the table wasn't built — lower-value
  relative to everything else in this list; the table's fixed column set
  already covers every field the spec's "Columns" section asked for.
- Merge only handles scalar-field conflicts + straightforward child-record
  reassignment; it does not attempt to de-duplicate/merge individual
  social account metrics if both creators happened to track the exact same
  handle (that case is already prevented at the database level by the
  unique `(platform, username)` constraint, so it can't arise from the UI).
- CSV/XLSX export is capped at 5,000 rows as a safety limit — irrelevant at
  current scale, worth remembering once real data grows.

## Tests performed

`npm run typecheck`, `npm run lint`, `npm run build`, and `npm test`
(43 Vitest assertions) all pass. All 17 migrations (Phase 1 + Phase 2) and
the expanded seed data were re-applied end-to-end against a local Postgres
instance from a clean database each time, with RLS confirmed enabled on
every new table and the duplicate-test creators verified present with the
expected name/email collisions. Full click-through (search, filters, save/
apply a filter, add a creator with duplicate warning, merge, archive/
restore, bulk actions, export) needs a live Supabase project to verify —
not retestable from this sandbox.

## Recommended next step (Phase 3)

CSV/XLSX creator database import: upload → preview → column mapping →
normalization (now reusable from `lib/normalize.ts`) → duplicate detection
(now reusable from `lib/duplicate-detection.ts`) → confirm → import, using
the `import_batches`/`import_rows` tables already in the Phase 1 schema.
Both of Phase 2's hardest pieces are already built as shared library code,
so Phase 3 is mostly UI (the upload/mapping wizard) plus wiring.
