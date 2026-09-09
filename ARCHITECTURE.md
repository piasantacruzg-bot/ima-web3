# Architecture

## Stack

- **Next.js 14 (App Router) + TypeScript + React 18** — server components by
  default, server actions for mutations, route groups for layout scoping.
- **Tailwind CSS** — utility-first styling, custom `ink`/`paper`/`line`/
  `brand`/`status` design tokens in `tailwind.config.ts` for the editorial
  premium-agency look (see `app/globals.css` for shared component classes:
  `.card`, `.btn-primary`, `.input`, etc).
- **Supabase** — Postgres database, Auth, Storage. `@supabase/ssr` bridges
  Supabase Auth sessions into Next.js's server/client component model via
  cookies.
- **lucide-react** for icons, **Recharts** for charts (Phase 9),
  **react-hook-form + zod** for forms (from Phase 2 on), **TanStack Table**
  for data tables (from Phase 2 on), **papaparse / xlsx** for the CSV/XLSX
  importer (Phase 3).

## Folder structure

```
app/
  layout.tsx              root layout (fonts, <html>/<body>)
  login/                  public login page + server action
  (app)/                  route group: everything behind auth
    layout.tsx            auth check + sidebar/topbar shell
    actions.ts             sign-out server action
    page.tsx               dashboard
    creators/ campaigns/ content/ reports/ imports/ settings/ integrations/
components/
  nav/                    sidebar, topbar, global search
  auth/                   login form
  ui/                     shared primitives (PageHeader, EmptyState, StatCard)
lib/
  supabase/               client.ts (browser), server.ts (server + service
                          role), middleware.ts (session refresh)
  auth.ts                 getCurrentUser() — session + profile
  dashboard.ts            dashboard data-fetching (real queries only)
types/
  database.ts             hand-written types mirroring the SQL schema
supabase/
  migrations/             numbered SQL migrations (source of truth for schema)
  seed.sql                demo data, clearly marked is_demo = true
legacy/
  whatsapp-reports/       previous Google Sheets tool (not wired in)
```

As the app grows, following phases add `lib/import/`, `lib/social/`,
`lib/analytics/`, `lib/recommendations/`, `lib/reports/` per the original
spec's suggested structure — kept out of Phase 1 since there's no code to
put in them yet (no empty scaffold directories).

## Auth model

- Supabase Auth (email/password). No public sign-up — an admin creates
  accounts (via the Supabase dashboard for now; an in-app invite flow is a
  natural Phase 2+ addition, not built yet).
- `middleware.ts` (root) + `lib/supabase/middleware.ts` refresh the session
  on every request and redirect unauthenticated requests to `/login`.
- `app/(app)/layout.tsx` re-checks auth server-side before rendering any
  protected page — never trusts that middleware ran.
- A `profiles` table (1:1 with `auth.users`) carries `role` (`admin` /
  `manager` / `member`), auto-created by a Postgres trigger on signup
  (`handle_new_auth_user`, see `supabase/migrations/..._profiles.sql`).
- Row Level Security enforces the role model at the database level — see
  `DATABASE.md`. The app never relies on hiding a button as its only access
  control.

## Data flow / no-fake-data principle

Every page in Phase 1 that shows a number queries Supabase directly (see
`lib/dashboard.ts` and the per-module stub pages) — there are no
hardcoded/mocked stats. Where a feature isn't built yet (creator CRUD,
campaign wizard, content tracking, reports), the page says so explicitly
via `EmptyState` rather than showing fabricated data or a non-functional
form. `/integrations` lists each social platform's real connection status
("Not connected") and what's required to connect it — never a fake
"Connected" badge.

## Why `@supabase/ssr` is pinned to `^0.12.6`

`@supabase/supabase-js` 2.115 shipped a rewritten (postgrest-js v2) typed
query builder. Older `@supabase/ssr` releases (this project initially had
`^0.5.2`, which under semver's `0.x` rules only ever resolves patch
releases) return a `SupabaseClient<Database, SchemaName, Schema>` shape
that no longer matches the current `SupabaseClient`'s type parameters,
which silently collapses every query's row type to `never`. `^0.12.6`
matches the current `supabase-js` API. If you see `Property '...' does not
exist on type 'never'` on a Supabase query, check this pairing first.

## Known limitation: local verification without a live Supabase project

This sandbox has no outbound access to a real Supabase project, so Phase 1
was verified as far as that allows:

- All 15 migrations + both views were applied to a local vanilla Postgres
  16 instance end-to-end without error (RLS enabled on all 15 tables).
- `supabase/seed.sql` was loaded against that same database and spot-
  checked with realistic dashboard-style queries (overdue deliverables,
  active campaigns, latest metrics per post).
- `npm run typecheck`, `npm run lint`, and `npm run build` all pass.
- `next dev` was run and hit directly: `/login` renders, `/` and every
  other protected route correctly 307-redirects to `/login` when
  unauthenticated (middleware works), and the login form renders and
  submits without crashing the server (it can't authenticate — there's no
  real Supabase Auth backend in this sandbox to test against).

What's **not** verified here because it requires a real Supabase project:
actual sign-in, RLS behavior against real JWTs, and Supabase Storage. Do
this once you connect a project (see `SETUP.md`).
