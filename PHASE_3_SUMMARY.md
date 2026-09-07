# Phase 3 summary

Smart Creator Database Import, Data Cleaning & Duplicate Resolution — a
9-step import wizard that turns messy CSV/XLSX creator exports into clean,
deduplicated creator records, per the detailed Phase 3 brief. Built on top
of Phase 1's existing `import_batches` / `import_rows` tables (extended,
not replaced) and Phase 2's creator schema, normalization utilities, and
duplicate-detection service (extended, not duplicated).

## What was built

**Import wizard (`/imports/new`)** — 9 steps, all client-side until the
final commit:
1. **Upload** — CSV or XLS/XLSX, validated (extension, size, non-empty)
   before parsing.
2. **Select Sheets** — every sheet in a workbook is parsed and listed with
   its row/column counts; the user picks which to import.
3. **Map Columns** — each selected sheet's headers get an auto-suggested
   target field (creator field, or a social field + platform), which the
   user can override, plus a per-sheet "this whole sheet is one platform"
   shortcut for exports that don't repeat the platform name on every
   column. Unmapped columns default to being kept as `custom_fields`
   unless explicitly unchecked — never silently discarded.
4. **Normalize Data** — every row is normalized through the same
   `lib/normalize.ts` used by manual entry, with a before/after preview and
   a running warning count (nothing guessed silently).
5. **Review Matches** — every clean row is matched against the full
   existing creator base (server-side, see Methodology below) and bucketed
   into All / New / Existing / Potential Duplicates tabs. Each row gets a
   default action (Create for no match, Update for an exact match, Keep
   Separate for anything less than exact) that the user can override to
   Update / Merge / Keep Separate / Skip; choosing Merge exposes a
   field-by-field Keep Existing / Use Imported picker for every field the
   row actually has data for.
6. **Review Errors** — rows that failed validation (missing name,
   out-of-range rating/brand-fit score) are listed with their specific
   errors; each can be explicitly skipped. They are never silently
   imported with bad data or silently dropped.
7. **Preview Import** — a plain-language summary (creators to create,
   update, merge, keep separate, skip, and rows in error) with a mandatory
   confirmation checkbox before the Import step becomes reachable.
8. **Import** — commits the batch via one server action; a single bad row
   is caught and recorded as an error without aborting the rest.
9. **Results** — final counts plus a link into the batch's detail page.

**Import history (`/imports`, `/imports/[id]`)**
- `/imports` lists every batch (file name, status, row/new/updated/error
  counts, date) with a "New import" action; the old placeholder page is
  replaced with real data.
- `/imports/[id]` shows full batch stats (new creators, updated creators,
  potential duplicates, new social accounts, updated fields, errors), a
  per-row table linking each row to the creator it created or matched, and
  a **Roll back this import** action (only offered while the batch hasn't
  already been rolled back).

**Creator profile data provenance**
- A creator created or last updated by an import now shows a "Data source"
  section on their profile linking back to the import batch, and any
  columns that didn't map to a real field appear under "Additional fields"
  (from `creators.custom_fields`) instead of being lost.

## Database changes

One migration, `20260907120000_import_pipeline_extensions.sql`, explained
before it was applied and validated against a clean local Postgres 16
instance (every migration + `seed.sql` re-applied from scratch, twice —
once mid-phase, once at final QA):

- **Extends** the existing `import_batches` / `import_rows` tables from
  Phase 1 rather than creating a parallel schema — this *is* the "imports"
  system the brief describes, under its original name:
  - `import_batches` gains `source_name`, `new_creators`,
    `existing_creators`, `potential_duplicates`, `new_social_accounts`,
    `updated_fields`, `started_at`, `rolled_back_at`, `metadata`.
  - `import_rows` gains `source_sheet`, `match_confidence`,
    `match_reasons`, `warnings`, `action`, `processed_at`, and
    `previous_creator_snapshot` (the full creator + social-account JSON
    from immediately before an update — what makes rollback of *updates*,
    not just creates, safe).
  - **Reused rather than duplicated:** the brief's "matched creator"
    concept is carried by Phase 1's existing `possible_duplicate_creator_id`
    column (widened in meaning from "possible duplicate" to "matched
    creator at any confidence") rather than adding a second, redundant
    column — a design correction made mid-phase after first adding a
    parallel `matched_creator_id` column and recognizing the overlap.
- Two new `import_row_status` values: `existing` (clean match, no review
  needed) and `ignored` (explicitly excluded).
- A new `import_row_action` enum: `create` / `update` / `merge` /
  `keep_separate` / `skip` / `ignore` — what a reviewer decided to do with
  a row, distinct from `status` (what was found).
- `creators.custom_fields` (jsonb) — flexible fields an import can populate
  that don't have a dedicated column (Rate Card, Audience Age, ...), shown
  on the profile, never required.
- `creator_performance_snapshots.import_id` — traces a historical snapshot
  back to the import that produced it.

## Import workflow

Upload → Select Sheets → Map Columns → Normalize Data → Review Matches →
Review Errors → Preview Import → Import → Results, exactly as specified.
Nothing is written to the database before step 8; steps 1–7 are pure
client-side computation over the parsed file, so a user can abandon an
import at any point with zero side effects.

## Methodology

**Column detection** (`lib/import/column-detection.ts`) — a normalized
header (lowercased, punctuation stripped) is matched against a curated
alias table per target field (e.g. "WhatsApp Number" / "Mobile Number" /
"Contact Number" → phone), first by exact match, then by whole-word
substring (never raw-character substring — an early version let "Internal
Priority Flag" false-match "er" for engagement rate, since "internal"
contains those characters; fixed to require whole-word alignment). A
platform token (Instagram/IG, TikTok/TT, YouTube/YT, Facebook/FB,
Twitter/X) is detected and stripped before matching, so "Instagram
Followers" resolves to the `followers` field *and* the `instagram`
platform in one pass. A generic, unprefixed social column (bare
"Engagement Rate") is attributed to the sheet's single platform bucket
when there's exactly one; with zero or multiple platforms present it's
left unmapped rather than guessed.

**Normalization** (`lib/normalize.ts`, `lib/import/normalize-row.ts`) —
the same parsers used by manual creator entry: follower counts with
K/M/B suffixes and thousands separators; engagement rates handling a `%`
sign, European decimal commas ("4,8%"), and bare fractions ("0.045" →
4.5%, since a real engagement fraction is always < 1 while a typed
percentage is always ≥ 1); emails and phones validated/normalized or left
blank (never repaired/guessed); categories/niches/tags split and
deduplicated case-insensitively; creator type and status matched against
small alias tables (e.g. "Activo" → `active`, "Nano Influencer" → `nano`)
with an unrecognized value left blank plus a warning rather than guessed.

**Duplicate matching** (`lib/import/match-creator.ts`) — a deterministic
three-tier hierarchy, built once per import as a set of lookup indices
(platform-user-id, username+platform, email, phone, plus city and
country+category for the lower tiers) so matching 10,000 rows against a
large creator base stays fast instead of an O(rows × pool) scan:
- **Exact** — platform user ID match (survives a username rename); exact
  username+platform; exact email; exact phone.
- **High** — the same username appearing on ≥2 of the row's platforms
  matched against the same creator; a username matching on some platform
  paired with a similar display name.
- **Low** — a similar display name *plus* a shared city, or a similar name
  *plus* a shared category and country.
- **Never**: name similarity alone. Every tier above "exact" requires at
  least one corroborating signal — this is enforced structurally (the
  code path for name similarity always requires a second signal to even
  be reached), not just documented as a rule.

A synthetic 10,000-row-against-5,000-creator scale test caught a real
performance bug during development: an early version blocked the
low-confidence scan by the name's first letter, which degenerates badly
whenever many creators share a prefix (a 5,000-creator synthetic pool all
starting with "Creator Name" took ~109 seconds to match 10,000 rows
against). Reblocking by the *corroborating* signal (city / country+category)
instead of the name brought that down to well under a second, since the
scan is now bounded by how many creators actually share that signal, not
by the pool size.

**Merge** (`lib/import/merge-decision.ts`) — for a matched creator, every
scalar field where the existing and imported values disagree is flagged as
a conflict; a blank existing field is auto-filled from the import, and an
agreeing field is left alone. Conflicting fields default to keeping the
existing value (never silently overwritten) unless the user explicitly
picks "Use imported" for that field. Array fields (categories, niches,
languages) always union both sides — additive data is never dropped by a
merge decision.

**Historical data** (`lib/import/social-account-merge.ts`) — matching an
imported social account to an existing one (by platform+username, or
platform user ID across a rename) computes which performance fields would
actually change; before applying the new value, the *previous* value is
written to `creator_performance_snapshots` (tagged with the import that
produced it), so a follower count is never overwritten without a
historical record of what it used to be. A brand-new social account found
on an existing creator is created outright (nothing to preserve).

**Source priority** — configurable at the row level: for any conflicting
field the user chooses per-field whether the existing or imported value
wins; there is no global "imported always wins" setting that could
silently clobber curated data.

**Rollback** (`rollbackImportBatch` in `app/(app)/imports/actions.ts`) —
never a blind delete of "everything from batch X." A row this import
*created* is archived (the same reversible soft-delete used everywhere
else a creator is removed) rather than hard-deleted. A row this import
*updated* has its creator and social-account fields restored from the
`previous_creator_snapshot` captured at commit time; a social account the
import created fresh on an otherwise-existing creator is removed outright,
since there's no "previous state" to restore it to. One row failing to
roll back cleanly doesn't abort the rest of the rollback. A batch can only
be rolled back once (`rolled_back_at` is checked and set).

## Files created

- `supabase/migrations/20260907120000_import_pipeline_extensions.sql`
- `lib/import/column-detection.ts`, `lib/import/match-creator.ts`,
  `lib/import/parse-file.ts`, `lib/import/normalize-row.ts`,
  `lib/import/validate-row.ts`, `lib/import/merge-decision.ts`,
  `lib/import/social-account-merge.ts`
- `lib/string-similarity.ts` (extracted from `lib/duplicate-detection.ts`
  so the import matcher and the manual duplicate-check UI share one
  definition of "similar name")
- `app/(app)/imports/actions.ts`, `app/(app)/imports/new/page.tsx`,
  `app/(app)/imports/[id]/page.tsx`
- `components/imports/import-wizard.tsx`,
  `components/imports/rollback-button.tsx`
- `scripts/generate-fixture.mjs` (regenerates the 1,000-row acceptance
  fixture deterministically)
- `tests/fixtures/01_clean_basic.csv` through `11_sparse_rows.csv`,
  `tests/fixtures/Influencers_2025.xlsx`
- `tests/column-detection.test.ts`, `tests/match-creator.test.ts`,
  `tests/parse-file.test.ts`, `tests/normalize-row.test.ts`,
  `tests/merge-decision.test.ts`, `tests/import-fixtures.test.ts`,
  `tests/import-scale.test.ts`

**Modified:** `lib/normalize.ts` (K/M/B, European decimals, bare
fractions, categories/email/phone normalizers, kept backward-compatible),
`lib/duplicate-detection.ts` (now imports shared similarity util),
`lib/creators.ts` (creator profile now returns import provenance),
`types/database.ts` (Phase 3 schema additions), `app/(app)/imports/page.tsx`
(real batch list, was a placeholder), `app/(app)/creators/[id]/page.tsx`
(Data source / Additional fields sections), `tests/normalize.test.ts`,
`tests/creator-merge.test.ts` (fixture updated for the new
`custom_fields` column).

## Tests created

130 Vitest assertions across 11 files, all pure-logic/no-database (the
sandbox has no network path to a live Supabase project):
normalize (29), column detection (12), duplicate matching incl. the
confidence hierarchy (12), file parsing incl. security/size/extension
validation (11), row normalization (14), merge decisions +
social-account-merge planning (10), the 11 named fixture scenarios plus
the 1,000-row acceptance fixture (12), a 10,000-row matching scale test
(1), plus the pre-existing Phase 1/2 suites (parse-url 11, creator
validation 13, creator merge 5).

## Tests passed

`npm run lint` — clean. `npm run typecheck` — clean. `npm test` — 130/130
passing. `npm run build` — succeeds (`/imports/new` ships as its own
~127KB client chunk for the wizard + xlsx/papaparse, not loaded elsewhere).
The full migration chain (18 files) plus `seed.sql` re-applied cleanly
against a clean local Postgres 16 instance.

## Known limitations

- **Merge review UI doesn't show the existing value for every field** —
  the field-by-field merge picker shows what the import would set but, to
  avoid shipping full creator records to the browser for every match
  candidate, doesn't display the *current* value inline; the user can open
  the existing profile in another tab to compare. A future pass could fetch
  the matched creator's full record only when a row is actually switched to
  "Merge."
- **Commit runs as one server-action call, not a background job** — for a
  very large import (tens of thousands of rows) on a strict serverless
  timeout, a single request could be cut off mid-batch. Rows already
  written stay written (nothing rolls back automatically on a timeout);
  re-running the import would need duplicate detection to catch the
  already-imported rows on a second pass, which it does, but a proper
  fix is a background job with progress polling.
- **No in-file duplicate pre-pass** — two rows in the *same* file that are
  duplicates of each other (not of an existing creator) are matched
  independently in the current design; if both are new, both get created
  as separate creators rather than being merged with each other before
  either touches the database.
- **AI-assisted suggestions were not built** — the brief scoped this as
  strictly optional ("may suggest but never auto-merge, invent data, or
  override deterministic matching"); the deterministic matcher alone
  covers the required behavior, so this was left out rather than adding
  an unused integration point.
- **10,000-row scale is synthetic, not end-to-end** — the scale test
  exercises the matching engine in isolation (no database); an actual
  10,000-row commit against Postgres wasn't run end-to-end since this
  sandbox has no network path to a live Supabase project.

## Recommended Phase 4

Campaign management: creating campaigns, attaching creators
(`campaign_creators`), deliverable tracking, and the real performance
rollups that campaign completion should feed into
`creator_performance_snapshots` — the same table this phase's import
history now also writes to, so Phase 4's reporting and this phase's import
provenance end up on one consistent timeline per creator.

---

Per the brief: stopping here. Phase 4 has not been started.
