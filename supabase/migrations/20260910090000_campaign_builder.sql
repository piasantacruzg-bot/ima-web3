-- Phase 4: Campaign Builder + Intelligent Creator Selection. Extends the
-- existing campaigns / campaign_creators / deliverables tables from Phase 1
-- (this IS the campaign system the brief describes) rather than replacing
-- them, and adds two new tables for deliverable templates and reusable
-- campaign templates.

-- campaign_creators already has a rich pipeline `status` enum (suggested ->
-- shortlisted -> contacted -> negotiating -> approved -> contracted ->
-- active -> completed, with `removed` as an exit). The Phase 4 brief's
-- "Statuses" list is the same pipeline plus two more exits.
alter type campaign_creator_status add value if not exists 'declined';
alter type campaign_creator_status add value if not exists 'not_available';

-- A *separate*, deliberately small "selection status" — the simple gate of
-- "is this creator on the campaign roster," distinct from the deal-pipeline
-- `status` above (which keeps evolving after selection: negotiating a
-- contract, going active, completing). "Recommended" from the brief is NOT
-- a stored value here: a recommended creator has no campaign_creators row
-- at all until a human acts on them (shortlist/select/reject) — the
-- recommendation itself is always computed live by the matching service,
-- never persisted as a fake decision.
create type campaign_creator_selection_status as enum (
  'shortlisted', 'selected', 'rejected'
);

alter table campaign_creators
  add column selection_status campaign_creator_selection_status,
  add column match_breakdown jsonb not null default '{}'::jsonb,
  add column proposed_fee numeric(12, 2) check (proposed_fee is null or proposed_fee >= 0),
  add column currency text,
  add column fee_type text,
  add column selected_at timestamptz,
  add column removed_at timestamptz;

create index campaign_creators_selection_status_idx
  on campaign_creators (selection_status);

-- campaigns: budget breakdown (section 24), configurable per-campaign
-- matching weights (section 15), structured objectives (section 6, next to
-- the existing free-text campaign_objectives which becomes "objective
-- notes"), campaign language (distinct from target_audience.languages,
-- which describes the *audience*), an internal owner distinct from
-- created_by, campaign-specific exclusions that never touch the creator
-- table (section 9), and archiving (same reversible pattern as creators —
-- never a hard delete from the list view).
alter table campaigns
  add column owner_id uuid references profiles (id) on delete set null,
  add column primary_objective text,
  add column secondary_objectives text[] not null default '{}',
  add column language text[] not null default '{}',
  add column creator_budget numeric(12, 2) check (creator_budget is null or creator_budget >= 0),
  add column production_budget numeric(12, 2) check (production_budget is null or production_budget >= 0),
  add column paid_media_budget numeric(12, 2) check (paid_media_budget is null or paid_media_budget >= 0),
  add column agency_fee numeric(12, 2) check (agency_fee is null or agency_fee >= 0),
  add column other_budget numeric(12, 2) check (other_budget is null or other_budget >= 0),
  add column matching_weights jsonb not null default '{}'::jsonb,
  add column excluded_creator_ids uuid[] not null default '{}',
  add column excluded_categories text[] not null default '{}',
  add column excluded_locations text[] not null default '{}',
  add column archived_at timestamptz;

-- Deliverable requirement templates (section 10): what a campaign expects
-- from *any* selected creator, before any creator is actually selected.
-- Turns into real per-creator `deliverables` rows via auto-assignment
-- (section 28) once a creator's selection_status becomes 'selected'.
create table campaign_deliverable_templates (
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

create index campaign_deliverable_templates_campaign_id_idx
  on campaign_deliverable_templates (campaign_id);

-- Traces an auto-generated deliverable back to the template that produced
-- it (nullable: a manually-added deliverable has no template).
alter table deliverables
  add column template_id uuid references campaign_deliverable_templates (id) on delete set null;

create index deliverables_template_id_idx on deliverables (template_id);

-- Reusable campaign templates (section 33) — the architecture only; no UI
-- ships for these in Phase 4 beyond "create campaign from template" using
-- an existing campaign as the source (see PHASE_4_SUMMARY.md).
create table campaign_templates (
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

create trigger campaign_templates_set_updated_at
  before update on campaign_templates
  for each row execute function set_updated_at();

alter table campaign_deliverable_templates enable row level security;
alter table campaign_templates enable row level security;

create policy campaign_deliverable_templates_select_staff on campaign_deliverable_templates
  for select using (is_staff());
create policy campaign_deliverable_templates_write_manager on campaign_deliverable_templates
  for insert with check (is_manager_or_admin());
create policy campaign_deliverable_templates_update_manager on campaign_deliverable_templates
  for update using (is_manager_or_admin()) with check (is_manager_or_admin());
create policy campaign_deliverable_templates_delete_manager on campaign_deliverable_templates
  for delete using (is_manager_or_admin());

create policy campaign_templates_select_staff on campaign_templates
  for select using (is_staff());
create policy campaign_templates_write_manager on campaign_templates
  for insert with check (is_manager_or_admin());
create policy campaign_templates_update_manager on campaign_templates
  for update using (is_manager_or_admin()) with check (is_manager_or_admin());
create policy campaign_templates_delete_admin on campaign_templates
  for delete using (is_admin());
