-- Phase 6: holds a discovered social post between a sync run and a
-- human decision (spec sections 14/15/43) — an ambiguous or unmatched
-- post is never auto-assigned to a campaign/deliverable; it waits here
-- for /content/matches (candidates present) or /content/import (no
-- candidates) to resolve it. Once resolved it stays here as a record
-- (match_status), it's never deleted.

create table if not exists discovered_content (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  platform social_platform not null,
  platform_post_id text not null,
  post_url text not null,
  published_at timestamptz,
  social_account_id uuid references social_accounts (id) on delete cascade,
  creator_id uuid references creators (id) on delete cascade,
  -- [{deliverableId, campaignId, campaignName, confidence}], empty when
  -- the matcher found no plausible deliverable at all.
  candidates jsonb not null default '[]',
  match_status text not null default 'pending',
  resolved_deliverable_id uuid references deliverables (id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (provider, platform_post_id)
);

create index if not exists discovered_content_status_idx on discovered_content (match_status);
create index if not exists discovered_content_creator_id_idx on discovered_content (creator_id);

alter table discovered_content enable row level security;

drop policy if exists discovered_content_select_staff on discovered_content;
create policy discovered_content_select_staff on discovered_content for select using (is_staff());
drop policy if exists discovered_content_write_staff on discovered_content;
create policy discovered_content_write_staff on discovered_content
  for insert with check (is_staff());
drop policy if exists discovered_content_update_staff on discovered_content;
create policy discovered_content_update_staff on discovered_content
  for update using (is_staff()) with check (is_staff());
