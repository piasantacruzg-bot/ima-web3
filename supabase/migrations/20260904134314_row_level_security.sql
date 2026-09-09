-- Row Level Security (sections 39, 44). This is an internal agency tool:
-- there is no public/anon access anywhere — every table requires an
-- authenticated Supabase Auth session with a profiles row. Within that:
--   * admin / manager can create and edit creators, campaigns, deliverables,
--     settings, and run imports/merges.
--   * member (operational/tracking role) can read everything and update
--     day-to-day tracking data (deliverable status, content, metrics,
--     stories) but cannot create creators/campaigns or touch settings.
--   * only admin can delete records or change another user's role.

alter table profiles enable row level security;
alter table creators enable row level security;
alter table social_accounts enable row level security;
alter table creator_performance_snapshots enable row level security;
alter table campaigns enable row level security;
alter table campaign_creators enable row level security;
alter table deliverables enable row level security;
alter table content_posts enable row level security;
alter table content_metrics enable row level security;
alter table story_metrics enable row level security;
alter table import_batches enable row level security;
alter table import_rows enable row level security;
alter table audit_log enable row level security;
alter table app_settings enable row level security;
alter table creator_scoring_weights enable row level security;

-- profiles: every staff member can see the team directory; only admins can
-- edit roles; users can update their own non-role profile fields.
create policy profiles_select_staff on profiles
  for select using (is_staff());
create policy profiles_update_self on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on profiles
  for update using (is_admin()) with check (is_admin());
create policy profiles_insert_admin on profiles
  for insert with check (is_admin());

-- creators
create policy creators_select_staff on creators for select using (is_staff());
create policy creators_write_manager on creators
  for insert with check (is_manager_or_admin());
create policy creators_update_manager on creators
  for update using (is_manager_or_admin()) with check (is_manager_or_admin());
create policy creators_delete_admin on creators
  for delete using (is_admin());

-- social_accounts
create policy social_accounts_select_staff on social_accounts for select using (is_staff());
create policy social_accounts_write_manager on social_accounts
  for insert with check (is_manager_or_admin());
create policy social_accounts_update_manager on social_accounts
  for update using (is_manager_or_admin()) with check (is_manager_or_admin());
create policy social_accounts_delete_admin on social_accounts
  for delete using (is_admin());

-- creator_performance_snapshots: system/service-role writes primarily;
-- staff can read, managers can insert manual snapshots.
create policy snapshots_select_staff on creator_performance_snapshots for select using (is_staff());
create policy snapshots_insert_manager on creator_performance_snapshots
  for insert with check (is_manager_or_admin());
create policy snapshots_delete_admin on creator_performance_snapshots
  for delete using (is_admin());

-- campaigns
create policy campaigns_select_staff on campaigns for select using (is_staff());
create policy campaigns_write_manager on campaigns
  for insert with check (is_manager_or_admin());
create policy campaigns_update_manager on campaigns
  for update using (is_manager_or_admin()) with check (is_manager_or_admin());
create policy campaigns_delete_admin on campaigns
  for delete using (is_admin());

-- campaign_creators
create policy campaign_creators_select_staff on campaign_creators for select using (is_staff());
create policy campaign_creators_write_manager on campaign_creators
  for insert with check (is_manager_or_admin());
create policy campaign_creators_update_manager on campaign_creators
  for update using (is_manager_or_admin()) with check (is_manager_or_admin());
create policy campaign_creators_delete_admin on campaign_creators
  for delete using (is_admin());

-- deliverables: operational tracking, so members can update status/URLs too.
create policy deliverables_select_staff on deliverables for select using (is_staff());
create policy deliverables_write_manager on deliverables
  for insert with check (is_manager_or_admin());
create policy deliverables_update_staff on deliverables
  for update using (is_staff()) with check (is_staff());
create policy deliverables_delete_admin on deliverables
  for delete using (is_admin());

-- content_posts: any staff member can log a URL and update sync/tracking.
create policy content_posts_select_staff on content_posts for select using (is_staff());
create policy content_posts_write_staff on content_posts
  for insert with check (is_staff());
create policy content_posts_update_staff on content_posts
  for update using (is_staff()) with check (is_staff());
create policy content_posts_delete_admin on content_posts
  for delete using (is_admin());

-- content_metrics: any staff member can add a manual/screenshot reading;
-- metrics are append-only history, so no update policy — corrections are
-- new rows, not edits (rule 6).
create policy content_metrics_select_staff on content_metrics for select using (is_staff());
create policy content_metrics_insert_staff on content_metrics
  for insert with check (is_staff());
create policy content_metrics_delete_admin on content_metrics
  for delete using (is_admin());

-- story_metrics
create policy story_metrics_select_staff on story_metrics for select using (is_staff());
create policy story_metrics_write_staff on story_metrics
  for insert with check (is_staff());
create policy story_metrics_update_staff on story_metrics
  for update using (is_staff()) with check (is_staff());
create policy story_metrics_delete_admin on story_metrics
  for delete using (is_admin());

-- import_batches / import_rows: manager+ only (this mutates the creator DB).
create policy import_batches_select_manager on import_batches for select using (is_manager_or_admin());
create policy import_batches_write_manager on import_batches
  for insert with check (is_manager_or_admin());
create policy import_batches_update_manager on import_batches
  for update using (is_manager_or_admin()) with check (is_manager_or_admin());
create policy import_rows_select_manager on import_rows for select using (is_manager_or_admin());
create policy import_rows_write_manager on import_rows
  for insert with check (is_manager_or_admin());
create policy import_rows_update_manager on import_rows
  for update using (is_manager_or_admin()) with check (is_manager_or_admin());

-- audit_log: any staff action can be logged; only managers+ can read it.
create policy audit_log_select_manager on audit_log for select using (is_manager_or_admin());
create policy audit_log_insert_staff on audit_log for insert with check (is_staff());

-- settings: everyone can read (needed to compute scores client-side /
-- display agency info); only admins can change them.
create policy app_settings_select_staff on app_settings for select using (is_staff());
create policy app_settings_update_admin on app_settings
  for update using (is_admin()) with check (is_admin());
create policy scoring_weights_select_staff on creator_scoring_weights for select using (is_staff());
create policy scoring_weights_update_admin on creator_scoring_weights
  for update using (is_admin()) with check (is_admin());
