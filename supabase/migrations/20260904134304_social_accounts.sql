-- One creator can have multiple social accounts (rule 3). OAuth tokens are
-- NEVER stored here — `access_token_reference` is an opaque pointer (e.g. a
-- Supabase Vault secret id / external secrets-manager key) resolved
-- server-side only. RLS below blocks anon/authenticated SELECT on that
-- column-sensitive data via a dedicated policy; the frontend must never
-- read it directly (server actions/API routes use the service role).

create table social_accounts (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references creators (id) on delete cascade,
  platform social_platform not null,
  username text not null,
  profile_url text,
  platform_user_id text,
  followers bigint check (followers is null or followers >= 0),
  following bigint check (following is null or following >= 0),
  posts_count bigint check (posts_count is null or posts_count >= 0),
  engagement_rate numeric(6, 3) check (engagement_rate is null or engagement_rate >= 0),
  average_likes bigint,
  average_comments bigint,
  average_views bigint,
  average_shares bigint,
  average_saves bigint,
  estimated_reach bigint,
  account_type social_account_type,
  is_connected boolean not null default false,
  oauth_status oauth_status not null default 'not_connected',
  access_token_reference text,
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  sync_status sync_status not null default 'never_synced',
  sync_error text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger social_accounts_set_updated_at
  before update on social_accounts
  for each row execute function set_updated_at();

create index social_accounts_creator_id_idx on social_accounts (creator_id);
create index social_accounts_platform_idx on social_accounts (platform);
create unique index social_accounts_platform_username_idx
  on social_accounts (platform, lower(username));
create unique index social_accounts_platform_user_id_idx
  on social_accounts (platform, platform_user_id)
  where platform_user_id is not null;
