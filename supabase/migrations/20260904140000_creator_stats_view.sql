-- Aggregated creator stats for the Creators list (section 15): followers,
-- engagement, average views, and reach are properties of a creator's
-- *social accounts*, not the creator row itself, so listing/filtering/
-- sorting by them needs a per-creator aggregate. This view computes that
-- aggregate once so the app can filter/sort server-side instead of pulling
-- every creator + every social account into the browser (section 43).
--
-- RLS note: views don't carry their own policies — Postgres evaluates the
-- underlying tables' RLS (creators, social_accounts, campaign_creators)
-- against the querying role, same as deliverables_with_computed_status.

create view creators_with_stats as
select
  c.*,
  coalesce(max(sa.followers), 0) as max_followers,
  coalesce(avg(sa.engagement_rate), 0) as avg_engagement_rate,
  coalesce(max(sa.average_views), 0) as max_average_views,
  coalesce(max(sa.estimated_reach), 0) as max_estimated_reach,
  count(distinct cc.campaign_id) as campaign_count,
  coalesce(array_agg(distinct sa.platform) filter (where sa.platform is not null), '{}') as platforms
from creators c
left join social_accounts sa on sa.creator_id = c.id
left join campaign_creators cc on cc.creator_id = c.id
group by c.id;
