-- Join table: a creator can participate in many campaigns without
-- duplicating the creator record (rule 2).

create table campaign_creators (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  creator_id uuid not null references creators (id) on delete cascade,
  status campaign_creator_status not null default 'suggested',
  negotiated_fee numeric(12, 2) check (negotiated_fee is null or negotiated_fee >= 0),
  approved_fee numeric(12, 2) check (approved_fee is null or approved_fee >= 0),
  payment_status payment_status not null default 'unpaid',
  contract_status contract_status not null default 'not_sent',
  briefing_status briefing_status not null default 'not_sent',
  match_score numeric(5, 2) check (match_score is null or (match_score >= 0 and match_score <= 100)),
  match_reasons text[] not null default '{}',
  notes text,
  added_by uuid references profiles (id) on delete set null,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (campaign_id, creator_id)
);

create trigger campaign_creators_set_updated_at
  before update on campaign_creators
  for each row execute function set_updated_at();

create index campaign_creators_campaign_id_idx on campaign_creators (campaign_id);
create index campaign_creators_creator_id_idx on campaign_creators (creator_id);
create index campaign_creators_status_idx on campaign_creators (status);
