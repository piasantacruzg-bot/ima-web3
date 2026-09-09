-- Safe re-run of 20260910090000_campaign_builder.sql — every statement is
-- guarded so it's a no-op if that specific piece already applied from a
-- previous partial run. Paste this WHOLE file; anything already in place
-- is skipped instead of erroring.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'campaign_creator_selection_status') then
    create type campaign_creator_selection_status as enum ('shortlisted', 'selected', 'rejected');
  end if;
end $$;

alter type campaign_creator_status add value if not exists 'declined';
alter type campaign_creator_status add value if not exists 'not_available';

alter table campaign_creators
  add column if not exists selection_status campaign_creator_selection_status,
  add column if not exists match_breakdown jsonb not null default '{}'::jsonb,
  add column if not exists proposed_fee numeric(12, 2),
  add column if not exists currency text,
  add column if not exists fee_type text,
  add column if not exists selected_at timestamptz,
  add column if not exists removed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'campaign_creators_proposed_fee_check'
  ) then
    alter table campaign_creators
      add constraint campaign_creators_proposed_fee_check check (proposed_fee is null or proposed_fee >= 0);
  end if;
end $$;

create index if not exists campaign_creators_selection_status_idx
  on campaign_creators (selection_status);

alter table campaigns
  add column if not exists owner_id uuid references profiles (id) on delete set null,
  add column if not exists primary_objective text,
  add column if not exists secondary_objectives text[] not null default '{}',
  add column if not exists language text[] not null default '{}',
  add column if not exists creator_budget numeric(12, 2),
  add column if not exists production_budget numeric(12, 2),
  add column if not exists paid_media_budget numeric(12, 2),
  add column if not exists agency_fee numeric(12, 2),
  add column if not exists other_budget numeric(12, 2),
  add column if not exists matching_weights jsonb not null default '{}'::jsonb,
  add column if not exists excluded_creator_ids uuid[] not null default '{}',
  add column if not exists excluded_categories text[] not null default '{}',
  add column if not exists excluded_locations text[] not null default '{}',
  add column if not exists archived_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'campaigns_creator_budget_check') then
    alter table campaigns add constraint campaigns_creator_budget_check check (creator_budget is null or creator_budget >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'campaigns_production_budget_check') then
    alter table campaigns add constraint campaigns_production_budget_check check (production_budget is null or production_budget >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'campaigns_paid_media_budget_check') then
    alter table campaigns add constraint campaigns_paid_media_budget_check check (paid_media_budget is null or paid_media_budget >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'campaigns_agency_fee_check') then
    alter table campaigns add constraint campaigns_agency_fee_check check (agency_fee is null or agency_fee >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'campaigns_other_budget_check') then
    alter table campaigns add constraint campaigns_other_budget_check check (other_budget is null or other_budget >= 0);
  end if;
end $$;

create table if not exists campaign_deliverable_templates (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  platform social_platform not null,
  content_type deliverable_content_type not null,
  quantity integer not null default 1 check (quantity > 0),
  default_due_date date,
  instructions text,
  usage_rights text,
  paid_media_rights boolean not null default false,
  exclusivity_requirements text,
  approval_required boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists campaign_deliverable_templates_campaign_id_idx
  on campaign_deliverable_templates (campaign_id);

alter table deliverables
  add column if not exists template_id uuid references campaign_deliverable_templates (id) on delete set null;

create index if not exists deliverables_template_id_idx on deliverables (template_id);

create table if not exists campaign_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  campaign_type text,
  default_objectives jsonb not null default '{}'::jsonb,
  default_requirements jsonb not null default '{}'::jsonb,
  default_deliverables jsonb not null default '[]'::jsonb,
  default_matching_weights jsonb not null default '{}'::jsonb,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'campaign_templates_set_updated_at') then
    create trigger campaign_templates_set_updated_at
      before update on campaign_templates
      for each row execute function set_updated_at();
  end if;
end $$;

alter table campaign_deliverable_templates enable row level security;
alter table campaign_templates enable row level security;

drop policy if exists campaign_deliverable_templates_select_staff on campaign_deliverable_templates;
create policy campaign_deliverable_templates_select_staff on campaign_deliverable_templates
  for select using (is_staff());
drop policy if exists campaign_deliverable_templates_write_manager on campaign_deliverable_templates;
create policy campaign_deliverable_templates_write_manager on campaign_deliverable_templates
  for insert with check (is_manager_or_admin());
drop policy if exists campaign_deliverable_templates_update_manager on campaign_deliverable_templates;
create policy campaign_deliverable_templates_update_manager on campaign_deliverable_templates
  for update using (is_manager_or_admin()) with check (is_manager_or_admin());
drop policy if exists campaign_deliverable_templates_delete_manager on campaign_deliverable_templates;
create policy campaign_deliverable_templates_delete_manager on campaign_deliverable_templates
  for delete using (is_manager_or_admin());

drop policy if exists campaign_templates_select_staff on campaign_templates;
create policy campaign_templates_select_staff on campaign_templates
  for select using (is_staff());
drop policy if exists campaign_templates_write_manager on campaign_templates;
create policy campaign_templates_write_manager on campaign_templates
  for insert with check (is_manager_or_admin());
drop policy if exists campaign_templates_update_manager on campaign_templates;
create policy campaign_templates_update_manager on campaign_templates
  for update using (is_manager_or_admin()) with check (is_manager_or_admin());
drop policy if exists campaign_templates_delete_admin on campaign_templates;
create policy campaign_templates_delete_admin on campaign_templates
  for delete using (is_admin());
