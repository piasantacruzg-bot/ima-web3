create table campaigns (
  id uuid primary key default gen_random_uuid(),
  campaign_name text not null,
  client_name text not null,
  brand_name text,
  description text,
  market text,
  country text,
  city text,
  campaign_type text,
  start_date date,
  end_date date,
  budget numeric(12, 2) check (budget is null or budget >= 0),
  status campaign_status not null default 'draft',
  campaign_objectives text,
  -- target_audience: { age_range, gender, locations[], interests[], languages[] }
  target_audience jsonb not null default '{}'::jsonb,
  target_categories text[] not null default '{}',
  target_platforms social_platform[] not null default '{}',
  -- creator_requirements: { min_followers, max_followers, min_engagement,
  --   creator_types[], locations[], budget_per_creator, creator_count }
  creator_requirements jsonb not null default '{}'::jsonb,
  notes text,
  is_demo boolean not null default false,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint campaigns_dates_check check (
    start_date is null or end_date is null or start_date <= end_date
  )
);

create trigger campaigns_set_updated_at
  before update on campaigns
  for each row execute function set_updated_at();

create index campaigns_status_idx on campaigns (status);
create index campaigns_client_name_idx on campaigns (client_name);
create index campaigns_dates_idx on campaigns (start_date, end_date);
create index campaigns_name_trgm_idx on campaigns using gin (campaign_name gin_trgm_ops);
