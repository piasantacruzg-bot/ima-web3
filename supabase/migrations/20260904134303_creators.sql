-- The single source of truth for a creator (section 6 / rule 1). A creator
-- exists exactly once and is referenced by campaigns, social accounts,
-- content and performance history — never duplicated per campaign.

create extension if not exists "pg_trgm";

create table creators (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  last_name text,
  display_name text not null,
  profile_image_url text,
  email citext,
  phone text,
  country text,
  city text,
  languages text[] not null default '{}',
  gender text,
  categories text[] not null default '{}',
  niches text[] not null default '{}',
  creator_type creator_type,
  status creator_status not null default 'prospect',
  bio text,
  notes text,
  manager_name text,
  manager_email citext,
  agency_name text,
  rate_card_notes text,
  brand_fit_score numeric(5, 2) check (brand_fit_score is null or (brand_fit_score >= 0 and brand_fit_score <= 100)),
  internal_rating numeric(3, 1) check (internal_rating is null or (internal_rating >= 0 and internal_rating <= 5)),
  is_demo boolean not null default false,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger creators_set_updated_at
  before update on creators
  for each row execute function set_updated_at();

create index creators_status_idx on creators (status);
create index creators_creator_type_idx on creators (creator_type);
create index creators_country_idx on creators (country);
create index creators_city_idx on creators (city);
create index creators_categories_idx on creators using gin (categories);
create index creators_niches_idx on creators using gin (niches);
create index creators_display_name_trgm_idx on creators using gin (display_name gin_trgm_ops);
create index creators_email_idx on creators (email);
create index creators_created_at_idx on creators (created_at desc);
