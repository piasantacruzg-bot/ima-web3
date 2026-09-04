create table deliverables (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  creator_id uuid not null references creators (id) on delete cascade,
  platform social_platform not null,
  content_type deliverable_content_type not null,
  quantity integer not null default 1 check (quantity > 0),
  due_date date,
  status deliverable_status not null default 'not_started',
  instructions text,
  caption_required boolean not null default false,
  approval_required boolean not null default false,
  published_url text,
  published_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger deliverables_set_updated_at
  before update on deliverables
  for each row execute function set_updated_at();

create index deliverables_campaign_id_idx on deliverables (campaign_id);
create index deliverables_creator_id_idx on deliverables (creator_id);
create index deliverables_status_idx on deliverables (status);
create index deliverables_due_date_idx on deliverables (due_date);

-- A deliverable is "late" the moment its due_date passes without being
-- published/cancelled — surfaced as a computed view rather than a stored
-- flag so it never goes stale.
create view deliverables_with_computed_status as
select
  d.*,
  case
    when d.status in ('published', 'cancelled') then d.status
    when d.due_date is not null and d.due_date < current_date and d.status not in ('published', 'cancelled')
      then 'late'::deliverable_status
    else d.status
  end as effective_status
from deliverables d;
