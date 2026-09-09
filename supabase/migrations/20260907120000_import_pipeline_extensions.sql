-- Phase 3: extends the Phase 1 import pipeline (import_batches/import_rows)
-- rather than creating parallel tables — this IS the "imports" system the
-- Phase 3 brief describes, just under its original name.

-- New per-row action vocabulary (what a reviewer decided to do with a row,
-- separate from `status`/match_status which describes what was *found*).
create type import_row_action as enum (
  'create', 'update', 'merge', 'keep_separate', 'skip', 'ignore'
);

-- 'existing' = matched an existing creator with no conflicts to review;
-- 'ignored' = a column/row the user explicitly chose not to import.
alter type import_row_status add value if not exists 'existing';
alter type import_row_status add value if not exists 'ignored';

alter table import_batches
  add column source_name text,
  add column new_creators integer not null default 0,
  add column existing_creators integer not null default 0,
  add column potential_duplicates integer not null default 0,
  add column new_social_accounts integer not null default 0,
  add column updated_fields integer not null default 0,
  add column started_at timestamptz,
  add column rolled_back_at timestamptz,
  add column metadata jsonb not null default '{}'::jsonb;

alter table import_rows
  add column source_sheet text,
  -- `possible_duplicate_creator_id` (Phase 1) already carries "the creator
  -- this row matched" for review; Phase 3 widens its meaning from just
  -- "possible duplicate" to "matched creator at any confidence" (exact
  -- matches get status 'existing' rather than 'duplicate') instead of
  -- adding a second, parallel matched-creator column.
  add column match_confidence numeric(5, 2),
  add column match_reasons jsonb not null default '[]'::jsonb,
  add column warnings jsonb not null default '[]'::jsonb,
  add column action import_row_action,
  add column processed_at timestamptz,
  -- Full creator (+ its social accounts) row as it looked immediately
  -- before this row's update was applied. This is what makes rollback of
  -- *updates* safe (not just rollback of newly-created rows) — see
  -- section 22 of the brief: "never perform blind delete everything"
  -- style rollback.
  add column previous_creator_snapshot jsonb;

-- Flexible custom fields an import can populate that don't have a
-- dedicated column (Rate Card, Audience Age, Creator Priority, ...).
-- Shown on the creator profile, never required.
alter table creators add column custom_fields jsonb not null default '{}'::jsonb;

-- Traces a historical snapshot back to the import that produced it, so a
-- rollback can (optionally) account for snapshots it created and the
-- creator profile can cite where a historical figure came from.
alter table creator_performance_snapshots
  add column import_id uuid references import_batches (id) on delete set null;

create index creator_performance_snapshots_import_id_idx
  on creator_performance_snapshots (import_id);
