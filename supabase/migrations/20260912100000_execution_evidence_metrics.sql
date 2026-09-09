-- Phase 5: Campaign Execution, Deliverables, Content Tracker, Evidence &
-- Metrics. Extends Phase 1's deliverables/content_posts/content_metrics
-- (these ARE the brief's "campaign_actions"/"content posts"/"metric
-- snapshots" concepts, under their original names) rather than building a
-- parallel schema, and adds the structural pieces that didn't exist yet:
-- per-Story instances, an evidence system, content-draft versioning, and a
-- notification architecture (schema only, per the brief's own scoping).

-- ---------------------------------------------------------------------
-- 1. Deliverables ("campaign_actions"): richer workflow + direct link to
--    the campaign_creators relationship they belong to.
-- ---------------------------------------------------------------------

-- The existing pipeline (not_started -> draft -> submitted -> needs_revision
-- -> approved -> scheduled -> published, with late/cancelled exits) already
-- covers most of the brief's section-17 workflow. Adding the stages it
-- doesn't yet have rather than renaming the ones it does (a deliverable's
-- very first stage becomes 'assigned', matching the brief's naming, and
-- 'in_review'/'metrics_collected' fill the two real gaps).
alter type deliverable_status add value if not exists 'assigned';
alter type deliverable_status add value if not exists 'brief';
alter type deliverable_status add value if not exists 'in_review';
alter type deliverable_status add value if not exists 'metrics_collected';

-- A new enum value can't be referenced (e.g. in a DEFAULT below) until the
-- transaction that added it has committed — Postgres error 55P04. This
-- commit closes that transaction; everything below runs in a fresh one.
commit;

alter table deliverables
  add column if not exists campaign_creator_id uuid references campaign_creators (id) on delete set null,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists usage_rights text,
  add column if not exists paid_media_rights boolean not null default false,
  add column if not exists exclusivity text;

-- New deliverables should start at the more descriptive 'assigned' stage;
-- existing rows keep whatever status they already have.
alter table deliverables alter column status set default 'assigned';

-- Backfill campaign_creator_id for existing rows from the (campaign_id,
-- creator_id) pair already on every deliverable.
update deliverables d
set campaign_creator_id = cc.id
from campaign_creators cc
where cc.campaign_id = d.campaign_id
  and cc.creator_id = d.creator_id
  and d.campaign_creator_id is null;

create index if not exists deliverables_campaign_creator_id_idx on deliverables (campaign_creator_id);

-- ---------------------------------------------------------------------
-- 2. Story instances — a Story deliverable with quantity 3 becomes three
--    independently trackable rows, never one shared record (spec
--    sections 6-7, non-negotiable).
-- ---------------------------------------------------------------------

create table if not exists story_instances (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references deliverables (id) on delete cascade,
  sequence_number integer not null check (sequence_number > 0),
  status deliverable_status not null default 'assigned',
  published_at timestamptz,
  content_url text,
  caption text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deliverable_id, sequence_number)
);

create trigger story_instances_set_updated_at
  before update on story_instances
  for each row execute function set_updated_at();

create index story_instances_deliverable_id_idx on story_instances (deliverable_id);

-- ---------------------------------------------------------------------
-- 3. Content posts ("Content Post"): add the direct campaign_creator_id
--    link (same rationale as deliverables above). post_url stays
--    required — a content_posts row specifically means "this is
--    published, with a URL"; content without a durable URL (Stories)
--    never gets one of these rows, it uses story_instances instead.
-- ---------------------------------------------------------------------

alter table content_posts
  add column if not exists campaign_creator_id uuid references campaign_creators (id) on delete set null;

update content_posts cp
set campaign_creator_id = cc.id
from campaign_creators cc
where cc.campaign_id = cp.campaign_id
  and cc.creator_id = cp.creator_id
  and cp.campaign_creator_id is null;

create index if not exists content_posts_campaign_creator_id_idx on content_posts (campaign_creator_id);

-- ---------------------------------------------------------------------
-- 4. Content metrics: generalize from "always belongs to a content_post"
--    to "belongs to exactly one of: content_post, story_instance,
--    deliverable" (spec section 9) — the most granular relationship
--    available. Adds the metric columns the brief distinguishes that
--    didn't exist yet (never conflating reposts with shares, etc.).
-- ---------------------------------------------------------------------

alter table content_metrics
  alter column content_id drop not null;

alter table content_metrics
  add column if not exists story_instance_id uuid references story_instances (id) on delete cascade,
  add column if not exists deliverable_id uuid references deliverables (id) on delete cascade,
  add column if not exists reposts bigint,
  add column if not exists website_clicks bigint,
  add column if not exists cta_clicks bigint,
  add column if not exists forward_taps bigint,
  add column if not exists back_taps bigint,
  add column if not exists exits bigint,
  add column if not exists video_starts bigint,
  add column if not exists three_second_views bigint,
  add column if not exists average_watch_time integer,
  -- Which denominator produced engagement_rate (spec section 13):
  -- 'reach' | 'impressions' | 'followers' | null when no rate was
  -- calculable. Never silently mixes methods across snapshots.
  add column if not exists engagement_rate_method text,
  add column if not exists is_estimated boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'content_metrics_one_parent_check'
  ) then
    alter table content_metrics add constraint content_metrics_one_parent_check check (
      (content_id is not null)::int + (story_instance_id is not null)::int + (deliverable_id is not null)::int = 1
    );
  end if;
end $$;

create index if not exists content_metrics_story_instance_id_idx on content_metrics (story_instance_id);
create index if not exists content_metrics_deliverable_id_idx on content_metrics (deliverable_id);
create index if not exists content_metrics_captured_at_idx2 on content_metrics (captured_at desc);

-- Latest-snapshot view, generalized to whichever parent a row has.
drop view if exists content_metrics_latest;
create view content_metrics_latest as
select distinct on (coalesce(content_id::text, story_instance_id::text, deliverable_id::text)) *
from content_metrics
order by coalesce(content_id::text, story_instance_id::text, deliverable_id::text), captured_at desc;

-- ---------------------------------------------------------------------
-- 5. Evidence system — proof a deliverable/content/Story was actually
--    produced, independent of whether it has a public URL.
-- ---------------------------------------------------------------------

create type evidence_type as enum (
  'public_url', 'screenshot', 'uploaded_file', 'google_drive', 'other'
);

create table if not exists content_evidence (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid references deliverables (id) on delete cascade,
  content_post_id uuid references content_posts (id) on delete cascade,
  story_instance_id uuid references story_instances (id) on delete cascade,
  evidence_type evidence_type not null,
  file_url text,
  storage_path text,
  screenshot_url text,
  drive_file_id text,
  drive_folder_id text,
  drive_url text,
  filename text,
  captured_at timestamptz,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references profiles (id) on delete set null,
  notes text,
  constraint content_evidence_one_parent_check check (
    (deliverable_id is not null)::int + (content_post_id is not null)::int + (story_instance_id is not null)::int >= 1
  )
);

create index content_evidence_deliverable_id_idx on content_evidence (deliverable_id);
create index content_evidence_content_post_id_idx on content_evidence (content_post_id);
create index content_evidence_story_instance_id_idx on content_evidence (story_instance_id);

-- ---------------------------------------------------------------------
-- 6. Content submissions — draft/revision versioning (spec section 19).
--    A deliverable can have many submitted versions; none are ever
--    destroyed, so the review history stays intact.
-- ---------------------------------------------------------------------

create type submission_approval_status as enum (
  'pending', 'approved', 'revision_requested', 'rejected'
);

create table if not exists content_submissions (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null references deliverables (id) on delete cascade,
  story_instance_id uuid references story_instances (id) on delete cascade,
  version_number integer not null check (version_number > 0),
  file_url text,
  storage_path text,
  content_url text,
  caption text,
  thumbnail_url text,
  notes text,
  approval_status submission_approval_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  submitted_by uuid references profiles (id) on delete set null,
  reviewed_at timestamptz,
  reviewed_by uuid references profiles (id) on delete set null,
  unique (deliverable_id, version_number)
);

create index content_submissions_deliverable_id_idx on content_submissions (deliverable_id);

-- ---------------------------------------------------------------------
-- 7. Notifications — architecture only (spec section 35: no delivery
--    integration required yet). A row is created by app logic at the
--    moments the brief lists (deliverable due, revision requested, ...);
--    nothing here sends an email or push notification.
-- ---------------------------------------------------------------------

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on notifications (user_id, created_at desc);
create index notifications_unread_idx on notifications (user_id) where read_at is null;

-- ---------------------------------------------------------------------
-- 8. Backfill: migrate existing story_metrics rows (Phase 1's flat,
--    metrics-only Story tracking) into the new story_instances +
--    content_evidence + content_metrics structure. story_metrics itself
--    is kept (never destroy existing data) but the app stops writing to
--    it — it's superseded, not deleted.
-- ---------------------------------------------------------------------

do $$
declare
  r record;
  new_instance_id uuid;
begin
  for r in
    select * from story_metrics
    where deliverable_id is not null
    order by deliverable_id, story_sequence
  loop
    insert into story_instances (deliverable_id, sequence_number, status, published_at, notes)
    values (r.deliverable_id, r.story_sequence, 'published', r.story_date::timestamptz, r.notes)
    on conflict (deliverable_id, sequence_number) do update set notes = excluded.notes
    returning id into new_instance_id;

    if r.screenshot_url is not null then
      insert into content_evidence (story_instance_id, evidence_type, screenshot_url, captured_at)
      values (new_instance_id, 'screenshot', r.screenshot_url, r.story_date::timestamptz);
    end if;

    insert into content_metrics (
      story_instance_id, captured_at, source, views, reach, replies, link_clicks,
      sticker_taps, exits, other_metrics
    )
    values (
      new_instance_id, r.created_at, 'manual', r.views, r.reach, r.replies, r.link_clicks,
      r.sticker_taps, r.exits, r.other_metrics
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 9. Storage bucket for evidence uploads (screenshots/files not routed
--    through Google Drive). Reuses the existing private-bucket +
--    signed-URL pattern; story-screenshots (Phase 1) stays available too.
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('content-evidence', 'content-evidence', false)
on conflict (id) do nothing;

alter table story_instances enable row level security;
alter table content_evidence enable row level security;
alter table content_submissions enable row level security;
alter table notifications enable row level security;

create policy story_instances_select_staff on story_instances for select using (is_staff());
create policy story_instances_write_staff on story_instances
  for insert with check (is_staff());
create policy story_instances_update_staff on story_instances
  for update using (is_staff()) with check (is_staff());
create policy story_instances_delete_admin on story_instances
  for delete using (is_admin());

create policy content_evidence_select_staff on content_evidence for select using (is_staff());
create policy content_evidence_write_staff on content_evidence
  for insert with check (is_staff());
create policy content_evidence_update_staff on content_evidence
  for update using (is_staff()) with check (is_staff());
create policy content_evidence_delete_admin on content_evidence
  for delete using (is_admin());

create policy content_submissions_select_staff on content_submissions for select using (is_staff());
create policy content_submissions_write_staff on content_submissions
  for insert with check (is_staff());
create policy content_submissions_update_staff on content_submissions
  for update using (is_staff()) with check (is_staff());
create policy content_submissions_delete_admin on content_submissions
  for delete using (is_admin());

-- Notifications are private to the user they belong to, regardless of role.
create policy notifications_select_own on notifications
  for select using (user_id = auth.uid());
create policy notifications_update_own on notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_insert_staff on notifications
  for insert with check (is_staff());
create policy notifications_delete_own on notifications
  for delete using (user_id = auth.uid());

create policy storage_content_evidence_select on storage.objects
  for select using (bucket_id = 'content-evidence' and is_staff());
create policy storage_content_evidence_write on storage.objects
  for insert with check (bucket_id = 'content-evidence' and is_staff());
create policy storage_content_evidence_delete on storage.objects
  for delete using (bucket_id = 'content-evidence' and is_admin());
