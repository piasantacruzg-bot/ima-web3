-- Phase 2 extensions: archiving (never hard-delete a creator by default —
-- spec section 15), internal notes, flexible tags, and saved filter
-- combinations.

alter table creators add column archived_at timestamptz;
alter table creators add column state_province text;

create index creators_archived_at_idx on creators (archived_at);

-- ============================================================
-- CREATOR NOTES
-- ============================================================
create table creator_notes (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators (id) on delete cascade,
  body text not null,
  author_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger creator_notes_set_updated_at
  before update on creator_notes
  for each row execute function set_updated_at();

create index creator_notes_creator_id_idx on creator_notes (creator_id);

alter table creator_notes enable row level security;

create policy creator_notes_select_staff on creator_notes for select using (is_staff());
create policy creator_notes_insert_staff on creator_notes for insert with check (is_staff());
create policy creator_notes_update_author_or_admin on creator_notes
  for update using (author_id = auth.uid() or is_admin())
  with check (author_id = auth.uid() or is_admin());
create policy creator_notes_delete_author_or_admin on creator_notes
  for delete using (author_id = auth.uid() or is_admin());

-- ============================================================
-- CREATOR TAGS
-- ============================================================
create table creator_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index creator_tags_name_lower_idx on creator_tags (lower(name));

alter table creator_tags enable row level security;

create policy creator_tags_select_staff on creator_tags for select using (is_staff());
create policy creator_tags_insert_manager on creator_tags for insert with check (is_manager_or_admin());
create policy creator_tags_delete_admin on creator_tags for delete using (is_admin());

create table creator_tag_assignments (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators (id) on delete cascade,
  tag_id uuid not null references creator_tags (id) on delete cascade,
  assigned_by uuid references profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (creator_id, tag_id)
);

create index creator_tag_assignments_creator_id_idx on creator_tag_assignments (creator_id);
create index creator_tag_assignments_tag_id_idx on creator_tag_assignments (tag_id);

alter table creator_tag_assignments enable row level security;

create policy creator_tag_assignments_select_staff on creator_tag_assignments
  for select using (is_staff());
create policy creator_tag_assignments_insert_staff on creator_tag_assignments
  for insert with check (is_staff());
create policy creator_tag_assignments_delete_staff on creator_tag_assignments
  for delete using (is_staff());

-- ============================================================
-- SAVED CREATOR FILTERS
-- ============================================================
create table saved_creator_filters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  user_id uuid not null references profiles (id) on delete cascade,
  filter_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger saved_creator_filters_set_updated_at
  before update on saved_creator_filters
  for each row execute function set_updated_at();

create index saved_creator_filters_user_id_idx on saved_creator_filters (user_id);

alter table saved_creator_filters enable row level security;

create policy saved_creator_filters_select_own on saved_creator_filters
  for select using (user_id = auth.uid());
create policy saved_creator_filters_insert_own on saved_creator_filters
  for insert with check (user_id = auth.uid());
create policy saved_creator_filters_update_own on saved_creator_filters
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy saved_creator_filters_delete_own on saved_creator_filters
  for delete using (user_id = auth.uid());

-- ============================================================
-- creators_with_stats: add aggregated tags
-- ============================================================
-- Dropped and recreated rather than CREATE OR REPLACE: the new
-- archived_at/state_province columns land in the middle of `c.*`, which
-- shifts every later column's position — Postgres refuses to REPLACE a
-- view when that happens ("cannot change name of view column").
drop view if exists creators_with_stats;

create view creators_with_stats as
select
  c.*,
  coalesce(max(sa.followers), 0) as max_followers,
  coalesce(avg(sa.engagement_rate), 0) as avg_engagement_rate,
  coalesce(max(sa.average_views), 0) as max_average_views,
  coalesce(max(sa.average_likes), 0) as max_average_likes,
  coalesce(max(sa.average_comments), 0) as max_average_comments,
  coalesce(max(sa.average_shares), 0) as max_average_shares,
  coalesce(max(sa.estimated_reach), 0) as max_estimated_reach,
  count(distinct cc.campaign_id) as campaign_count,
  coalesce(array_agg(distinct sa.platform) filter (where sa.platform is not null), '{}') as platforms,
  coalesce(array_agg(distinct ct.name) filter (where ct.name is not null), '{}') as tags,
  primary_account.platform as primary_platform,
  primary_account.username as primary_username
from creators c
left join social_accounts sa on sa.creator_id = c.id
left join campaign_creators cc on cc.creator_id = c.id
left join creator_tag_assignments cta on cta.creator_id = c.id
left join creator_tags ct on ct.id = cta.tag_id
left join lateral (
  select platform, username
  from social_accounts
  where creator_id = c.id
  order by followers desc nulls last
  limit 1
) primary_account on true
group by c.id, primary_account.platform, primary_account.username;
