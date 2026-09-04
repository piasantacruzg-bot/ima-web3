# Environment variables

All variables are documented with placeholders in `.env.example`. Never
commit real secrets — `.env.local` is gitignored.

## Required (Phase 1)

| Variable | Used by | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | browser + server | Public — safe to expose. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser + server | Public — RLS is what actually protects data, not secrecy of this key. |
| `SUPABASE_SERVICE_ROLE_KEY` | server only (`lib/supabase/server.ts` → `createServiceRoleClient`) | **Bypasses RLS.** Never prefixed `NEXT_PUBLIC_`, never imported into a client component. Not used by any Phase 1 code path yet — reserved for privileged server-only work (e.g. resolving OAuth token references in Phase 6). |

## Optional — social platform APIs (Phase 6+)

Until these are set, the corresponding platform in `/integrations` stays
"Not connected" and all content/metrics for that platform stay in manual
collection mode. The app never fakes a connected/synced state.

| Variable | Platform |
|---|---|
| `META_APP_ID`, `META_APP_SECRET`, `META_REDIRECT_URI` | Instagram / Meta Graph API |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_REDIRECT_URI` | TikTok for Developers |
| `X_CLIENT_ID`, `X_CLIENT_SECRET`, `X_REDIRECT_URI` | X API |
| `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI` | YouTube Data API v3 |

## Optional — AI campaign matching (Phase 8)

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Parses a pasted client brief into structured campaign requirements. Never used to invent creator metrics — only to structure a search against real database data (spec rule: AI explains recommendations from real data, never fabricates numbers). |

## Legacy tool only

`GOOGLE_SHEET_ID`, `GOOGLE_SHEET_TAB`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
`GOOGLE_PRIVATE_KEY` — only needed if you run `legacy/whatsapp-reports`
standalone. Not used by Creator Campaign OS.
