-- Import pipeline (section 18): upload -> preview -> map columns ->
-- normalize -> detect duplicates -> confirm -> import. The original
-- uploaded row is preserved in `raw_data` forever (never destroyed), even
-- after normalization and even if the row is later skipped as a duplicate.

create table import_batches (
  id uuid primary key default gen_random_uuid(),
  source_filename text not null,
  file_type import_file_type not null,
  status import_batch_status not null default 'uploaded',
  -- column_mapping: { "Instagram Handle": "instagram_username", "Followers": "followers", ... }
  column_mapping jsonb not null default '{}'::jsonb,
  storage_path text,
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  error_rows integer not null default 0,
  error_message text,
  uploaded_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index import_batches_status_idx on import_batches (status);
create index import_batches_created_at_idx on import_batches (created_at desc);

create table import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references import_batches (id) on delete cascade,
  row_number integer not null,
  raw_data jsonb not null,
  normalized_data jsonb,
  status import_row_status not null default 'pending',
  possible_duplicate_creator_id uuid references creators (id) on delete set null,
  duplicate_resolution duplicate_resolution not null default 'unresolved',
  error_message text,
  created_creator_id uuid references creators (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (batch_id, row_number)
);

create index import_rows_batch_id_idx on import_rows (batch_id);
create index import_rows_status_idx on import_rows (status);
create index import_rows_possible_duplicate_idx on import_rows (possible_duplicate_creator_id);
