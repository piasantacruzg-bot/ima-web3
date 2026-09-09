-- Settings (sections 17, 38). Two singleton tables enforced via a
-- `id integer primary key default 1 check (id = 1)` pattern — there is
-- exactly one agency and exactly one active scoring model at a time.

create table app_settings (
  id integer primary key default 1 check (id = 1),
  agency_name text not null default 'Creator Campaign OS',
  agency_logo_url text,
  default_currency text not null default 'USD',
  default_campaign_settings jsonb not null default '{}'::jsonb,
  report_settings jsonb not null default '{}'::jsonb,
  sync_frequency_hours integer not null default 6 check (sync_frequency_hours > 0),
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger app_settings_set_updated_at
  before update on app_settings
  for each row execute function set_updated_at();

insert into app_settings (id) values (1);

-- Creator scoring weights (section 17). Weights are percentages (0-100)
-- that should sum to ~100; enforced in the application layer rather than a
-- hard DB constraint so an admin can save a work-in-progress adjustment.
create table creator_scoring_weights (
  id integer primary key default 1 check (id = 1),
  engagement_weight numeric(5, 2) not null default 20,
  avg_views_weight numeric(5, 2) not null default 20,
  historical_performance_weight numeric(5, 2) not null default 20,
  audience_fit_weight numeric(5, 2) not null default 15,
  brand_fit_weight numeric(5, 2) not null default 15,
  cost_efficiency_weight numeric(5, 2) not null default 10,
  reliability_weight numeric(5, 2) not null default 0,
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger creator_scoring_weights_set_updated_at
  before update on creator_scoring_weights
  for each row execute function set_updated_at();

insert into creator_scoring_weights (id) values (1);
