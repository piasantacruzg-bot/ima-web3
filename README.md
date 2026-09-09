# Creator Campaign OS

Internal operating system for a creative/marketing agency's creator and
influencer campaigns: one centralized creator database, campaign proposals,
deliverable tracking, and reporting — replacing spreadsheet-driven workflows.

See `ARCHITECTURE.md`, `DATABASE.md`, `SETUP.md`, `ENVIRONMENT.md`, and
`API_INTEGRATIONS.md` for details. `PHASE_1_SUMMARY.md` documents what's
built so far and what's next.

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in your Supabase project's URL/keys
# Apply supabase/migrations/*.sql to your Supabase project (SQL editor or
# `supabase db push`), then optionally supabase/seed.sql for demo data.
npm run dev
```

Open <http://localhost:3000>. Unauthenticated requests redirect to
`/login`; accounts are provisioned by an admin (there is no public sign-up —
this is an internal tool).

## Status

Phase 1 (foundation: schema, auth, navigation, dashboard), Phase 2
(Creator Database: search, filters, profiles, create/edit, archiving,
notes, tags, saved filters, bulk actions, export, duplicate detection and
merge), Phase 3 (CSV/XLSX import: column detection, normalization,
deterministic duplicate matching, safe merge, historical-data preservation,
and rollback), Phase 4 (Campaign Management + Intelligent Creator
Selection: campaign wizard, deterministic creator matching with explained
scores, shortlist/select/reject workflow, budget tracking, and automatic
deliverable assignment), and Phase 5 (Campaign Execution, Deliverables,
Content Tracker, Evidence & Metrics: per-Story-instance tracking, a content
workflow state machine, manual metric entry with full history preservation,
an evidence system, a Content Tracker UI, campaign dashboards/reports, and
CSV/XLSX execution export) are complete. See `PHASE_1_SUMMARY.md`,
`PHASE_2_SUMMARY.md`, `PHASE_3_SUMMARY.md`, `PHASE_4_SUMMARY.md`, and
`PHASE_5_SUMMARY.md` for what's built and what's next.

## Tests

```bash
npm test
```

## Legacy tool

`legacy/whatsapp-reports/` is the agency's previous Google Sheets–based
reporting tool. It predates this rebuild and isn't wired into the app —
kept for reference, see `legacy/whatsapp-reports/NOTE.md`.
