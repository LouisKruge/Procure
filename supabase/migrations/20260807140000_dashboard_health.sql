-- NEXUS Stock :: 13 inventory health
--
-- Two figures the overview screen wants and could not previously get
-- without pulling every stock line into the page:
--
--   * the range split into four health bands, and
--   * where the money at risk actually sits, by category.
--
-- One round trip, one scan, both answers.
--
-- On the health score: it is a weighted share of lines that are available
-- to issue, not an invented index. Full credit for a line comfortably above
-- its minimum, three quarters for one inside twice the minimum, a third for
-- one at or below it, nothing for a line at zero. The four counts are
-- returned alongside so the number can always be taken apart - a score
-- nobody can decompose is a score nobody should trust.

create or replace function public.inventory_health(p_site_id uuid default null)
returns table (
  good_lines     bigint,
  watch_lines    bigint,
  at_risk_lines  bigint,
  critical_lines bigint,
  total_lines    bigint,
  health_score   numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with banded as (
    select case
             when sl.qty_on_hand <= 0 then 'critical'
             when sl.qty_on_hand <= si.reorder_point then 'at_risk'
             when si.reorder_point > 0
              and sl.qty_on_hand <= si.reorder_point * 2 then 'watch'
             else 'good'
           end as band
      from public.stock_levels sl
      join public.stock_items si on si.id = sl.item_id
     where si.is_active
       and sl.site_id in (select public.accessible_site_ids())
       and (p_site_id is null or sl.site_id = p_site_id)
  ),
  counted as (
    select
      count(*) filter (where band = 'good')     as good_lines,
      count(*) filter (where band = 'watch')    as watch_lines,
      count(*) filter (where band = 'at_risk')  as at_risk_lines,
      count(*) filter (where band = 'critical') as critical_lines,
      count(*)                                  as total_lines
    from banded
  )
  select good_lines, watch_lines, at_risk_lines, critical_lines, total_lines,
         case when total_lines = 0 then 100
              else round(
                (good_lines + watch_lines * 0.75 + at_risk_lines * 0.35)
                  * 100.0 / total_lines,
                0)
         end as health_score
    from counted;
$$;

comment on function public.inventory_health is
  'Range split into good / watch / at-risk / critical, with a decomposable health score.';

-- Where the exposure sits. Only lines at or below their minimum count -
-- healthy stock is not "risk" however much of it there is.
create or replace function public.risk_by_category(
  p_site_id uuid default null,
  p_limit   integer default 5
)
returns table (
  category_name text,
  lines         bigint,
  value_at_risk numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(parent.name, c.name, 'Uncategorised') as category_name,
         count(*)                                       as lines,
         round(sum(sl.qty_on_hand * si.avg_cost), 2)    as value_at_risk
    from public.stock_levels sl
    join public.stock_items si on si.id = sl.item_id
    left join public.categories c on c.id = si.category_id
    left join public.categories parent on parent.id = c.parent_id
   where si.is_active
     and sl.qty_on_hand <= si.reorder_point
     and sl.site_id in (select public.accessible_site_ids())
     and (p_site_id is null or sl.site_id = p_site_id)
   group by 1
   order by value_at_risk desc nulls last
   limit greatest(p_limit, 1);
$$;

comment on function public.risk_by_category is
  'Stock value sitting on lines at or below their minimum, grouped by category group.';

revoke all on function public.inventory_health(uuid) from public, anon;
revoke all on function public.risk_by_category(uuid, integer) from public, anon;
grant execute on function public.inventory_health(uuid) to authenticated;
grant execute on function public.risk_by_category(uuid, integer) to authenticated;
