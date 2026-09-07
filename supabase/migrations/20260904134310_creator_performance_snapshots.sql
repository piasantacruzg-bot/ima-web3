-- Historical performance snapshots (section 8). This is the table that lets
-- a creator's historical performance accumulate across campaigns over time
-- (rule 10) without ever mutating past records. Rows are typically written
-- when a campaign completes or on a periodic sync, aggregating from
-- content_metrics — but the table also accepts point-in-time snapshots tied
-- directly to a social account (e.g. monthly follower counts).

create table creator_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators (id) on delete cascade,
  social_account_id uuid references social_accounts (id) on delete set null,
  campaign_id uuid references campaigns (id) on delete set null,
  content_id uuid references content_posts (id) on delete set null,
  snapshot_date date not null default current_date,
  followers bigint,
  reach bigint,
  impressions bigint,
  views bigint,
  likes bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  clicks bigint,
  engagements bigint,
  engagement_rate numeric(6, 3),
  cpm numeric(10, 2),
  cpe numeric(10, 4),
  cost_per_reach numeric(10, 4),
  created_at timestamptz not null default now()
);

create index creator_performance_snapshots_creator_id_idx
  on creator_performance_snapshots (creator_id);
create index creator_performance_snapshots_campaign_id_idx
  on creator_performance_snapshots (campaign_id);
create index creator_performance_snapshots_snapshot_date_idx
  on creator_performance_snapshots (creator_id, snapshot_date desc);
