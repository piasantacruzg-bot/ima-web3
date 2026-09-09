-- Metrics history for a content post. Every capture is a new row —
-- historical metrics are never overwritten (rule 6), so the agency can see
-- how a post evolved over time and so old campaign performance survives.

create table content_metrics (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references content_posts (id) on delete cascade,
  captured_at timestamptz not null default now(),
  source metric_source not null default 'manual',
  views bigint,
  reach bigint,
  impressions bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  clicks bigint,
  replies bigint,
  engagements bigint,
  engagement_rate numeric(6, 3),
  watch_time integer,
  completion_rate numeric(5, 2),
  link_clicks bigint,
  sticker_taps bigint,
  other_metrics jsonb not null default '{}'::jsonb,
  captured_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index content_metrics_content_id_idx on content_metrics (content_id);
create index content_metrics_captured_at_idx on content_metrics (content_id, captured_at desc);

-- Convenience view: the most recent metrics snapshot per content post.
create view content_metrics_latest as
select distinct on (content_id) *
from content_metrics
order by content_id, captured_at desc;

-- Manual story tracking (section 14). Stories don't have a durable public
-- URL, so they're tracked as their own entity with a required screenshot
-- rather than forced through content_posts/content_metrics.
create table story_metrics (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators (id) on delete cascade,
  campaign_id uuid references campaigns (id) on delete set null,
  social_account_id uuid references social_accounts (id) on delete set null,
  deliverable_id uuid references deliverables (id) on delete set null,
  screenshot_url text,
  story_date date not null,
  story_sequence integer not null default 1 check (story_sequence > 0),
  views bigint,
  reach bigint,
  replies bigint,
  link_clicks bigint,
  sticker_taps bigint,
  exits bigint,
  other_metrics jsonb not null default '{}'::jsonb,
  notes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger story_metrics_set_updated_at
  before update on story_metrics
  for each row execute function set_updated_at();

create index story_metrics_creator_id_idx on story_metrics (creator_id);
create index story_metrics_campaign_id_idx on story_metrics (campaign_id);
create index story_metrics_story_date_idx on story_metrics (story_date);
