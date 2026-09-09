-- Creator Campaign OS — core extensions and enumerated types
-- These enums back the controlled vocabularies from the spec (creator type,
-- status, platform, etc). Using enums keeps the UI's filter/sort options in
-- sync with what the database will actually accept.

create extension if not exists "pgcrypto";
create extension if not exists "citext";

create type user_role as enum ('admin', 'manager', 'member');

create type creator_type as enum ('nano', 'micro', 'mid', 'macro', 'mega');

create type creator_status as enum (
  'prospect', 'approved', 'active', 'inactive', 'do_not_work_with'
);

create type social_platform as enum (
  'instagram', 'tiktok', 'x', 'youtube', 'facebook', 'other'
);

create type social_account_type as enum ('personal', 'creator', 'business');

create type oauth_status as enum (
  'not_connected', 'connected', 'expired', 'revoked', 'error'
);

create type sync_status as enum (
  'never_synced', 'syncing', 'synced', 'error', 'unsupported'
);

create type campaign_status as enum (
  'draft', 'proposal', 'approved', 'recruiting', 'active', 'completed', 'cancelled'
);

create type campaign_creator_status as enum (
  'suggested', 'shortlisted', 'contacted', 'negotiating', 'approved',
  'contracted', 'active', 'completed', 'removed'
);

create type payment_status as enum (
  'unpaid', 'invoiced', 'partial', 'paid'
);

create type contract_status as enum (
  'not_sent', 'sent', 'negotiating', 'signed', 'declined'
);

create type briefing_status as enum (
  'not_sent', 'sent', 'acknowledged', 'in_progress', 'complete'
);

create type deliverable_content_type as enum (
  'instagram_reel', 'instagram_post', 'instagram_carousel', 'instagram_story',
  'tiktok', 'x_post', 'youtube_short', 'youtube_video', 'facebook_post', 'other'
);

create type deliverable_status as enum (
  'not_started', 'draft', 'submitted', 'needs_revision', 'approved',
  'scheduled', 'published', 'late', 'cancelled'
);

create type collection_method as enum (
  'api', 'url_import', 'manual', 'screenshot'
);

create type metric_source as enum (
  'api', 'manual', 'screenshot', 'imported', 'url'
);

create type import_file_type as enum ('csv', 'xlsx');

create type import_batch_status as enum (
  'uploaded', 'mapped', 'previewed', 'importing', 'completed', 'failed'
);

create type import_row_status as enum (
  'pending', 'imported', 'duplicate', 'error', 'skipped'
);

create type duplicate_resolution as enum ('unresolved', 'merged', 'kept_separate');

-- Reusable trigger to keep `updated_at` current on any table that has it.
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
