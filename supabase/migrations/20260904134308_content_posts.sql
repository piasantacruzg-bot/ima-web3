-- A content post belongs to a campaign and creator (rule 4). It carries the
-- identifying info (URL, platform, post id) plus a `collection_method` that
-- is always honest about how the record got here — never faked as API data.

create table content_posts (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  creator_id uuid not null references creators (id) on delete cascade,
  deliverable_id uuid references deliverables (id) on delete set null,
  social_account_id uuid references social_accounts (id) on delete set null,
  platform social_platform not null,
  content_type deliverable_content_type not null,
  post_url text not null,
  platform_post_id text,
  thumbnail_url text,
  caption text,
  published_at timestamptz,
  collection_method collection_method not null default 'url_import',
  sync_status sync_status not null default 'never_synced',
  sync_error text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger content_posts_set_updated_at
  before update on content_posts
  for each row execute function set_updated_at();

create index content_posts_campaign_id_idx on content_posts (campaign_id);
create index content_posts_creator_id_idx on content_posts (creator_id);
create index content_posts_deliverable_id_idx on content_posts (deliverable_id);
create index content_posts_platform_idx on content_posts (platform);
-- Same URL can't be tracked twice (data-quality rule, section 40).
create unique index content_posts_post_url_idx on content_posts (post_url);
