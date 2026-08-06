-- NEXUS Stock :: 10 stock location + usage analytics
--
-- Two additions driven by the real Eventspec data:
--
--  1. `location` is a separate field from `bin`. The workbook carries a
--     warehouse code (RB, WS) alongside the bin number (AA-01), and they
--     answer different questions - which store, then which rack.
--
--  2. Usage analytics. Everything here is derived from stock_movements, so
--     it is empty on day one and fills in as stock is booked in and out.
--     Nothing is back-filled or estimated.

alter table public.stock_items add column if not exists default_location text;
alter table public.stock_levels add column if not exists location text;

create index if not exists stock_levels_location_idx on public.stock_levels (location);
create index if not exists stock_items_location_idx  on public.stock_items (default_location);

-- v_stock_status gains location; dependent views are rebuilt with it.
drop view if exists public.v_reorder_suggestions;
drop view if exists public.v_stock_valuation;
drop view if exists public.v_stock_status;

create view public.v_stock_status
with (security_invoker = true) as
select sl.id as level_id, sl.item_id, sl.site_id,
       s.code as site_code, s.name as site_name,
       si.sku, si.description, si.uom, si.barcode,
       si.category_id, c.name as category_name,
       parent.name as group_name,
       si.reorder_point, si.reorder_qty, si.avg_cost, si.standard_cost,
       si.default_supplier_id, sup.name as default_supplier_name,
       sl.qty_on_hand, sl.qty_in_transit, sl.qty_on_order,
       sl.bin_location,
       coalesce(sl.location, si.default_location) as location,
       sl.last_movement_at,
       round(sl.qty_on_hand * si.avg_cost, 2) as stock_value,
       case
         when sl.qty_on_hand <= 0 then 'out'
         when sl.qty_on_hand <= si.reorder_point then 'low'
         else 'ok'
       end as stock_status
  from public.stock_levels sl
  join public.stock_items si on si.id = sl.item_id
  join public.sites s on s.id = sl.site_id
  left join public.categories c on c.id = si.category_id
  left join public.categories parent on parent.id = c.parent_id
  left join public.suppliers sup on sup.id = si.default_supplier_id
 where si.is_active;

create view public.v_reorder_suggestions
with (security_invoker = true) as
select ss.item_id, ss.site_id, ss.site_code, ss.site_name,
       ss.sku, ss.description, ss.uom, ss.category_name,
       ss.bin_location, ss.location,
       ss.qty_on_hand, ss.qty_on_order, ss.reorder_point, ss.reorder_qty,
       ss.stock_status,
       greatest(ss.reorder_qty, ss.reorder_point - ss.qty_on_hand - ss.qty_on_order) as suggested_qty,
       coalesce(pref.supplier_id, ss.default_supplier_id) as supplier_id,
       coalesce(psup.name, ss.default_supplier_name) as supplier_name,
       pref.supplier_part_no,
       coalesce(pref.last_price, ss.avg_cost) as unit_price,
       coalesce(psup.lead_time_days, 7) as lead_time_days
  from public.v_stock_status ss
  left join lateral (
    select sil.supplier_id, sil.supplier_part_no, sil.last_price
      from public.supplier_items sil
     where sil.item_id = ss.item_id
     order by sil.is_preferred desc, sil.last_price_at desc nulls last
     limit 1
  ) pref on true
  left join public.suppliers psup on psup.id = pref.supplier_id
 where ss.qty_on_hand + ss.qty_on_order <= ss.reorder_point
   and ss.reorder_point > 0;

create view public.v_stock_valuation
with (security_invoker = true) as
select ss.site_id, ss.site_code, ss.site_name,
       count(*) filter (where ss.qty_on_hand > 0) as lines_with_stock,
       count(*) as lines_total,
       sum(ss.qty_on_hand) as total_qty,
       round(sum(ss.qty_on_hand * ss.avg_cost), 2) as total_value
  from public.v_stock_status ss
 group by ss.site_id, ss.site_code, ss.site_name;

grant select on public.v_stock_status        to authenticated;
grant select on public.v_reorder_suggestions to authenticated;
grant select on public.v_stock_valuation     to authenticated;

-- ------------------------------------------------------------- item usage
-- Per-item consumption over a window: what went out, what came in, how fast
-- it moves and how long the shelf will last at that rate.
create or replace function public.item_usage_stats(
  p_days    integer default 90,
  p_site_id uuid default null,
  p_limit   integer default 500
)
returns table (
  item_id            uuid,
  sku                text,
  description        text,
  category_name      text,
  group_name         text,
  bin_location       text,
  location           text,
  uom                text,
  qty_on_hand        numeric,
  avg_cost           numeric,
  stock_value        numeric,
  reorder_point      numeric,
  qty_issued         numeric,
  qty_received       numeric,
  issue_events       bigint,
  issued_value       numeric,
  avg_per_week       numeric,
  avg_per_month      numeric,
  days_cover         numeric,
  last_issued_at     timestamptz,
  turnover_rate      numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with window_days as (select greatest(p_days, 1)::numeric as d),
  moves as (
    select m.item_id,
           sum(case when m.movement_type = 'dispatch' then m.qty else 0 end) as issued,
           sum(case when m.movement_type = 'receipt'  then m.qty else 0 end) as received,
           count(*) filter (where m.movement_type = 'dispatch')              as issue_events,
           sum(case when m.movement_type = 'dispatch' then m.qty * m.unit_cost else 0 end) as issued_value,
           max(m.created_at) filter (where m.movement_type = 'dispatch')     as last_issued
      from public.stock_movements m
     where m.created_at >= now() - make_interval(days => greatest(p_days, 1))
       and (p_site_id is null or m.site_id = p_site_id)
     group by m.item_id
  )
  select ss.item_id,
         ss.sku,
         ss.description,
         ss.category_name,
         ss.group_name,
         ss.bin_location,
         ss.location,
         ss.uom,
         ss.qty_on_hand,
         ss.avg_cost,
         ss.stock_value,
         ss.reorder_point,
         coalesce(mv.issued, 0),
         coalesce(mv.received, 0),
         coalesce(mv.issue_events, 0),
         round(coalesce(mv.issued_value, 0), 2),
         round(coalesce(mv.issued, 0) / (w.d / 7), 2),
         round(coalesce(mv.issued, 0) / (w.d / 30.44), 2),
         -- How many days the current shelf lasts at the observed rate.
         case
           when coalesce(mv.issued, 0) > 0
           then round(ss.qty_on_hand / (mv.issued / w.d), 1)
           else null
         end,
         mv.last_issued,
         -- Times the holding turned over during the window.
         case
           when ss.qty_on_hand > 0 and coalesce(mv.issued, 0) > 0
           then round(mv.issued / ss.qty_on_hand, 3)
           else 0
         end
    from public.v_stock_status ss
    cross join window_days w
    left join moves mv on mv.item_id = ss.item_id
   where (p_site_id is null or ss.site_id = p_site_id)
   order by coalesce(mv.issued, 0) desc, ss.stock_value desc
   limit greatest(p_limit, 1);
$$;

-- ------------------------------------------------------- period movement
-- Received vs issued bucketed by week or month, for the trend charts.
create or replace function public.usage_by_period(
  p_bucket  text default 'week',
  p_periods integer default 12,
  p_site_id uuid default null
)
returns table (
  period_start   date,
  period_label   text,
  qty_issued     numeric,
  qty_received   numeric,
  issued_value   numeric,
  received_value numeric,
  issue_events   bigint,
  receipt_events bigint,
  items_touched  bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with cfg as (
    select case when lower(p_bucket) = 'month' then 'month' else 'week' end as unit
  ),
  periods as (
    select date_trunc((select unit from cfg), now()) - (make_interval(days => 1) * 0)
             - (n * (case when (select unit from cfg) = 'month'
                          then interval '1 month' else interval '1 week' end)) as start_ts
      from generate_series(0, greatest(p_periods, 1) - 1) n
  )
  select p.start_ts::date,
         case when (select unit from cfg) = 'month'
              then to_char(p.start_ts, 'Mon YYYY')
              else 'w/c ' || to_char(p.start_ts, 'DD Mon')
         end,
         coalesce(sum(case when m.movement_type = 'dispatch' then m.qty end), 0),
         coalesce(sum(case when m.movement_type = 'receipt'  then m.qty end), 0),
         round(coalesce(sum(case when m.movement_type = 'dispatch' then m.qty * m.unit_cost end), 0), 2),
         round(coalesce(sum(case when m.movement_type = 'receipt'  then m.qty * m.unit_cost end), 0), 2),
         count(*) filter (where m.movement_type = 'dispatch'),
         count(*) filter (where m.movement_type = 'receipt'),
         count(distinct m.item_id)
    from periods p
    left join public.stock_movements m
      on m.created_at >= p.start_ts
     and m.created_at < p.start_ts + (case when (select unit from cfg) = 'month'
                                           then interval '1 month' else interval '1 week' end)
     and (p_site_id is null or m.site_id = p_site_id)
   group by p.start_ts
   order by p.start_ts;
$$;

-- --------------------------------------------------- consumption by group
create or replace function public.usage_by_category(
  p_days    integer default 90,
  p_site_id uuid default null
)
returns table (
  category_id   uuid,
  category_name text,
  group_name    text,
  lines         bigint,
  qty_on_hand   numeric,
  stock_value   numeric,
  qty_issued    numeric,
  issued_value  numeric,
  lines_moving  bigint,
  lines_dead    bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with moves as (
    select m.item_id, sum(m.qty) as issued, sum(m.qty * m.unit_cost) as issued_value
      from public.stock_movements m
     where m.movement_type = 'dispatch'
       and m.created_at >= now() - make_interval(days => greatest(p_days, 1))
       and (p_site_id is null or m.site_id = p_site_id)
     group by m.item_id
  )
  select ss.category_id,
         coalesce(ss.category_name, 'Uncategorised'),
         coalesce(ss.group_name, ss.category_name, 'Uncategorised'),
         count(*),
         sum(ss.qty_on_hand),
         round(sum(ss.stock_value), 2),
         round(coalesce(sum(mv.issued), 0), 2),
         round(coalesce(sum(mv.issued_value), 0), 2),
         count(*) filter (where mv.issued > 0),
         count(*) filter (where mv.issued is null and ss.qty_on_hand > 0)
    from public.v_stock_status ss
    left join moves mv on mv.item_id = ss.item_id
   where (p_site_id is null or ss.site_id = p_site_id)
   group by ss.category_id, ss.category_name, ss.group_name
   order by round(coalesce(sum(mv.issued_value), 0), 2) desc, sum(ss.stock_value) desc;
$$;

-- ----------------------------------------------------- ordering vs usage
-- What was ordered on purchase orders against what was actually consumed,
-- so over- and under-ordering is visible per item.
create or replace function public.ordered_vs_used(
  p_days    integer default 90,
  p_site_id uuid default null,
  p_limit   integer default 200
)
returns table (
  item_id       uuid,
  sku           text,
  description   text,
  uom           text,
  qty_ordered   numeric,
  qty_received  numeric,
  qty_issued    numeric,
  qty_on_hand   numeric,
  order_count   bigint,
  balance       numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  with ordered as (
    select pol.item_id,
           sum(pol.qty_ordered)  as qty_ordered,
           sum(pol.qty_received) as qty_received,
           count(distinct po.id) as order_count
      from public.purchase_order_lines pol
      join public.purchase_orders po on po.id = pol.purchase_order_id
     where po.order_date >= (now() - make_interval(days => greatest(p_days, 1)))::date
       and po.status <> 'cancelled'
       and (p_site_id is null or po.site_id = p_site_id)
     group by pol.item_id
  ),
  used as (
    select m.item_id, sum(m.qty) as qty_issued
      from public.stock_movements m
     where m.movement_type = 'dispatch'
       and m.created_at >= now() - make_interval(days => greatest(p_days, 1))
       and (p_site_id is null or m.site_id = p_site_id)
     group by m.item_id
  ),
  ids as (
    select item_id from ordered union select item_id from used
  )
  select i.item_id,
         si.sku,
         si.description,
         si.uom,
         coalesce(o.qty_ordered, 0),
         coalesce(o.qty_received, 0),
         coalesce(u.qty_issued, 0),
         coalesce((
           select sum(sl.qty_on_hand) from public.stock_levels sl
            where sl.item_id = i.item_id
              and (p_site_id is null or sl.site_id = p_site_id)
         ), 0),
         coalesce(o.order_count, 0),
         coalesce(o.qty_received, 0) - coalesce(u.qty_issued, 0)
    from ids i
    join public.stock_items si on si.id = i.item_id
    left join ordered o on o.item_id = i.item_id
    left join used u    on u.item_id = i.item_id
   order by coalesce(u.qty_issued, 0) desc
   limit greatest(p_limit, 1);
$$;

revoke all on function public.item_usage_stats(integer, uuid, integer) from public, anon;
revoke all on function public.usage_by_period(text, integer, uuid)     from public, anon;
revoke all on function public.usage_by_category(integer, uuid)         from public, anon;
revoke all on function public.ordered_vs_used(integer, uuid, integer)  from public, anon;

grant execute on function public.item_usage_stats(integer, uuid, integer) to authenticated;
grant execute on function public.usage_by_period(text, integer, uuid)     to authenticated;
grant execute on function public.usage_by_category(integer, uuid)         to authenticated;
grant execute on function public.ordered_vs_used(integer, uuid, integer)  to authenticated;
