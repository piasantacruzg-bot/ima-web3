# Testing

`npm test` runs the Vitest suite in `tests/` — pure-logic unit tests only
(normalization, social URL parsing, creator form validation, merge
field-diffing). There are no integration/DB or e2e tests: everything that
touches Supabase (queries, RLS, server actions, duplicate detection)
needs a real project and is verified manually — see the Phase 2 section
below. Playwright/e2e is reasonable groundwork for a later phase once
there's a stable UI worth automating click-throughs against.

## What was verified for Phase 1 (and how)

1. **Migrations** — all 15 files in `supabase/migrations/` applied in
   order against a local vanilla PostgreSQL 16 instance with zero errors,
   including RLS policies and storage bucket policies (stubbed
   `auth.users`/`storage.*` schemas locally since those are normally
   provided by the Supabase platform, not a bare Postgres). Confirmed RLS
   is enabled on all 15 application tables.
2. **Seed data** — `supabase/seed.sql` loaded cleanly against that same
   database (20 creators, 35 social accounts, 5 campaigns, 10
   campaign_creators, 11 deliverables, 7 content_posts, 10 content_metrics,
   4 performance snapshots, 3 story_metrics). Spot-checked with realistic
   queries: overdue-deliverables view correctly flagged the one seeded
   overdue row, active-campaigns query returned the 2 seeded active
   campaigns, latest-metrics-per-post view returned correct rows.
3. **Typecheck** — `npm run typecheck` (`tsc --noEmit`) passes with zero
   errors.
4. **Lint** — `npm run lint` (`next lint`) passes with zero warnings.
5. **Build** — `npm run build` succeeds; all protected routes compile as
   dynamic (`ƒ`), confirming no page attempts static generation against
   Supabase data at build time.
6. **Runtime smoke test** — ran `next dev` with placeholder Supabase env
   vars (no real project — this sandbox has no outbound access to one) and
   confirmed: `/login` returns 200 and renders the actual form; `/` and
   every other protected route (`/creators`, `/campaigns`, `/content`,
   `/reports`, `/imports`, `/settings`, `/integrations`) return a 307
   redirect to `/login?next=...` when unauthenticated, confirming
   middleware works; submitting the login form doesn't crash the server.

## What's not verified (needs a real Supabase project)

- Actual sign-in / session persistence.
- RLS behavior against real JWTs for each role (admin/manager/member).
- Supabase Storage bucket access.
- The `handle_new_auth_user` trigger firing on real signup.

## Phase 2 manual pass

Once you're on the Phase 2 migrations + seed data:

1. `/creators` shows 34 seeded creators; search "Miami", filter by
   platform/category/status, sort by followers — counts should update and
   the URL should carry the filter state (reload the page, filters stay).
2. Add a creator, paste a real Instagram/TikTok URL into the social
   accounts field — it should split into platform + handle automatically.
3. Add a creator named "Sofia Martinez" in Miami — you should get a
   duplicate warning against the seeded "Sofia Martinez" before it saves.
4. On a creator's profile: add a note, add a tag, change status from the
   header dropdown (no page reload needed), archive it (disappears from
   the default list), restore it from its own profile.
5. From two of the seeded near-duplicate creators (e.g. the two
   "camila.torres.dup@demo.ima" records), use "Check duplicates" → Merge,
   resolve any conflicting fields, and confirm the merged profile shows
   both records' social accounts/tags/notes and the other is archived.
6. Select a few rows in the list, try a bulk status change and bulk
   archive; export the current filtered view as CSV and as XLSX and open
   both.

Once you have a project connected (`SETUP.md`), a minimal manual pass:

1. Create a user in the Supabase Dashboard, confirm a `profiles` row
   appears automatically with `role = 'member'`.
2. Promote it to `admin` (see `SETUP.md` step 4), sign in, confirm you land
   on the dashboard (not redirected back to `/login`).
3. Sign out, confirm you're redirected to `/login` and protected routes
   redirect again.
4. Run `supabase/seed.sql`, reload the dashboard, confirm the stat cards
   and lists show the seeded counts (2 active campaigns, 1 overdue
   deliverable, etc. — see `supabase/seed.sql` for exact expected values).
