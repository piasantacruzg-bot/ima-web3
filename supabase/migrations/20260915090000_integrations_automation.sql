-- Phase 6: Integrations, Social APIs, Google Drive & Campaign Automation.
-- Extends Phase 5's execution model (deliverables/story_instances/
-- content_posts/content_metrics/content_evidence) and Phase 1's
-- social_accounts (oauth_status/access_token_reference/last_synced_at
-- etc. already exist there — this does NOT create a second identity or
-- connection-status system for creators' accounts). Adds only the pieces
-- that didn't exist yet: secure token storage, sync logs, automation
-- rules, a richer notifications shape, and idempotency/deleted-content
-- support for social sync.

-- ---------------------------------------------------------------------
-- 1. Secure token storage. Tokens are stored encrypted (see
--    lib/integrations/token-store.ts — AES-256-GCM using a server-only
--    key from INTEGRATION_TOKEN_ENCRYPTION_KEY, never sent to the
--    browser); this table only ever holds ciphertext. One row per
--    connected social account, or one provider-level row for Google
--    Drive (social_account_id null) since Drive isn't a per-creator
--    connection.
-- ---------------------------------------------------------------------

create table if not exists integration_tokens (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  social_account_id uuid references social_accounts (id) on delete cascade,
  access_token_encrypted text,
  refresh_token_encrypted text,
  expires_at timestamptz,
  scopes text[] not null default '{}',
  connected_by uuid references profiles (id) on delete set null,
  connected_at timestamptz not null default now(),
  last_refreshed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists integration_tokens_provider_account_idx
  on integration_tokens (provider, social_account_id)
  where social_account_id is not null;
create unique index if not exists integration_tokens_provider_only_idx
  on integration_tokens (provider)
  where social_account_id is null;

drop trigger if exists integration_tokens_set_updated_at on integration_tokens;
create trigger integration_tokens_set_updated_at
  before update on integration_tokens
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Sync logs — one row per sync run (account/content/metrics), so
--    "last sync" / "sync errors" everywhere in the UI reads from real
--    history rather than a single mutable "last_synced_at" field alone.
-- ---------------------------------------------------------------------

create table if not exists integration_sync_logs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  social_account_id uuid references social_accounts (id) on delete cascade,
  sync_type text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'running',
  records_found integer not null default 0,
  records_created integer not null default 0,
  records_updated integer not null default 0,
  records_skipped integer not null default 0,
  records_failed integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists integration_sync_logs_provider_idx on integration_sync_logs (provider, started_at desc);
create index if not exists integration_sync_logs_account_idx on integration_sync_logs (social_account_id, started_at desc);

-- ---------------------------------------------------------------------
-- 3. Automation rules — deterministic, transparent, and editable. Not a
--    general rule engine: each row is one of the four fixed rule keys
--    lib/automation.ts evaluates, with a plain on/off switch and a
--    little jsonb config (e.g. how many days ahead counts as "due
--    soon").
-- ---------------------------------------------------------------------

create table if not exists automation_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  name text not null,
  description text,
  is_enabled boolean not null default true,
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists automation_rules_set_updated_at on automation_rules;
create trigger automation_rules_set_updated_at
  before update on automation_rules
  for each row execute function set_updated_at();

insert into automation_rules (rule_key, name, description, config) values
  ('deliverable_overdue', 'Deliverable overdue', 'Notify when a deliverable passes its due date without being published or cancelled.', '{}'),
  ('metrics_missing', 'Metrics needed', 'Notify when published content has no metric snapshot yet.', '{"grace_hours": 24}'),
  ('evidence_missing', 'Evidence missing', 'Notify when a published Story instance has no evidence on file.', '{}'),
  ('connection_expired', 'Connection needs reauthorization', 'Notify the connection owner when a social/Drive connection needs reauthorization or sync starts failing.', '{}')
on conflict (rule_key) do nothing;

-- ---------------------------------------------------------------------
-- 4. Notifications — extends Phase 5's schema-only table with the
--    direct campaign/creator/deliverable/content-post references the
--    brief asks for, instead of only the generic entity_type/entity_id
--    pair. Existing rows (there are none yet — Phase 5 never wrote to
--    this table) are unaffected; every new column is nullable.
-- ---------------------------------------------------------------------

alter table notifications
  add column if not exists campaign_id uuid references campaigns (id) on delete cascade,
  add column if not exists creator_id uuid references creators (id) on delete cascade,
  add column if not exists deliverable_id uuid references deliverables (id) on delete cascade,
  add column if not exists content_post_id uuid references content_posts (id) on delete cascade;

create index if not exists notifications_campaign_id_idx on notifications (campaign_id);
create index if not exists notifications_deliverable_id_idx on notifications (deliverable_id);

-- ---------------------------------------------------------------------
-- 5. Deleted/unavailable content (spec section 42) — an API reporting a
--    post no longer exists never deletes the record; it's flagged so
--    the UI can say so while every prior URL/metrics/evidence/audit
--    entry stays exactly as it was.
-- ---------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type content_status as enum ('active', 'unavailable');
  end if;
end $$;

alter table content_posts
  add column if not exists content_status content_status not null default 'active',
  add column if not exists unavailable_detected_at timestamptz;

-- ---------------------------------------------------------------------
-- 6. Idempotent social-content matching (spec section 41): provider +
--    platform_post_id is the primary de-dupe key; post_url (already
--    unique since Phase 1) is the fallback when a platform doesn't
--    expose a stable post id.
-- ---------------------------------------------------------------------

create unique index if not exists content_posts_platform_post_id_idx
  on content_posts (platform, platform_post_id)
  where platform_post_id is not null;

-- ---------------------------------------------------------------------
-- 7. RLS for the new tables — same is_staff()/is_admin() pattern used
--    everywhere else since Phase 1.
-- ---------------------------------------------------------------------

alter table integration_tokens enable row level security;
alter table integration_sync_logs enable row level security;
alter table automation_rules enable row level security;

drop policy if exists integration_tokens_select_staff on integration_tokens;
create policy integration_tokens_select_staff on integration_tokens for select using (is_staff());
drop policy if exists integration_tokens_write_admin on integration_tokens;
create policy integration_tokens_write_admin on integration_tokens
  for insert with check (is_admin());
drop policy if exists integration_tokens_update_admin on integration_tokens;
create policy integration_tokens_update_admin on integration_tokens
  for update using (is_admin()) with check (is_admin());
drop policy if exists integration_tokens_delete_admin on integration_tokens;
create policy integration_tokens_delete_admin on integration_tokens
  for delete using (is_admin());

drop policy if exists integration_sync_logs_select_staff on integration_sync_logs;
create policy integration_sync_logs_select_staff on integration_sync_logs for select using (is_staff());
drop policy if exists integration_sync_logs_write_staff on integration_sync_logs;
create policy integration_sync_logs_write_staff on integration_sync_logs
  for insert with check (is_staff());
drop policy if exists integration_sync_logs_update_staff on integration_sync_logs;
create policy integration_sync_logs_update_staff on integration_sync_logs
  for update using (is_staff()) with check (is_staff());

drop policy if exists automation_rules_select_staff on automation_rules;
create policy automation_rules_select_staff on automation_rules for select using (is_staff());
drop policy if exists automation_rules_write_admin on automation_rules;
create policy automation_rules_write_admin on automation_rules
  for update using (is_admin()) with check (is_admin());
