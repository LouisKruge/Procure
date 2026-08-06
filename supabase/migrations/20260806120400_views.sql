-- NEXUS Stock :: 05 reporting views
-- All views are security_invoker so the caller's RLS still applies:
-- a staff member querying a valuation view sees only their own sites.

-- One row per item per site, with the reorder verdict already computed so
-- the dashboard does not have to re-derive it in the client.
create view public.v_stock_status
with (security_invoker = true) as
select sl.id            as level_id,
       sl.item_id,
       sl.site_id,
       s.code           as site_code,
       s.name           as site_name,
       si.sku,
       si.description,
       si.uom,
       si.barcode,
       si.category_id,
       c.name           as category_name,
       si.reorder_point,
       si.reorder_qty,
       si.avg_cost,
       si.standard_cost,
       si.default_supplier_id,
       sup.name         as default_supplier_name,
       sl.qty_on_hand,
       sl.qty_in_transit,
       sl.qty_on_order,
       sl.bin_location,
       sl.last_movement_at,
       round(sl.qty_on_hand * si.avg_cost, 2) as stock_value,
       case
         when sl.qty_on_hand <= 0                  then 'out'
         when sl.qty_on_hand <= si.reorder_point   then 'low'
         else 'ok'
       end as stock_status
  from public.stock_levels sl
  join public.stock_items si on si.id = sl.item_id
  join public.sites       s  on s.id  = sl.site_id
  left join public.categories c   on c.id   = si.category_id
  left join public.suppliers  sup on sup.id = si.default_supplier_id
 where si.is_active;

-- What needs ordering, and from whom. Anything already on order in
-- sufficient quantity drops off the list so the same shortfall is not
-- ordered twice.
create view public.v_reorder_suggestions
with (security_invoker = true) as
select ss.item_id,
       ss.site_id,
       ss.site_code,
       ss.site_name,
       ss.sku,
       ss.description,
       ss.uom,
       ss.category_name,
       ss.qty_on_hand,
       ss.qty_on_order,
       ss.reorder_point,
       ss.reorder_qty,
       ss.stock_status,
       greatest(
         ss.reorder_qty,
         ss.reorder_point - ss.qty_on_hand - ss.qty_on_order
       ) as suggested_qty,
       coalesce(pref.supplier_id, ss.default_supplier_id) as supplier_id,
       coalesce(psup.name, ss.default_supplier_name)      as supplier_name,
       pref.supplier_part_no,
       coalesce(pref.last_price, ss.avg_cost)             as unit_price,
       coalesce(psup.lead_time_days, 7)                   as lead_time_days
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

-- Stock valuation, per site. Combine in the client (or sum this) for the
-- group total.
create view public.v_stock_valuation
with (security_invoker = true) as
select ss.site_id,
       ss.site_code,
       ss.site_name,
       count(*) filter (where ss.qty_on_hand > 0)  as lines_with_stock,
       count(*)                                    as lines_total,
       sum(ss.qty_on_hand)                         as total_qty,
       round(sum(ss.qty_on_hand * ss.avg_cost), 2) as total_value
  from public.v_stock_status ss
 group by ss.site_id, ss.site_code, ss.site_name;

-- Movement log with the joins already done, for the CSV export screen.
create view public.v_movement_log
with (security_invoker = true) as
select m.id,
       m.created_at,
       m.movement_type,
       m.direction,
       m.qty,
       m.qty_after,
       m.unit_cost,
       round(m.qty * m.unit_cost, 2) as movement_value,
       m.reason,
       m.reference_type,
       m.reference_id,
       m.reference_no,
       m.item_id,
       si.sku,
       si.description,
       si.uom,
       m.site_id,
       s.code as site_code,
       s.name as site_name,
       m.user_id,
       p.full_name as user_name,
       p.email     as user_email
  from public.stock_movements m
  join public.stock_items si on si.id = m.item_id
  join public.sites       s  on s.id  = m.site_id
  left join public.profiles p on p.id = m.user_id;

-- Purchase order headers with supplier, totals and outstanding value.
create view public.v_purchase_order_summary
with (security_invoker = true) as
select po.id,
       po.po_number,
       po.status,
       po.order_date,
       po.expected_date,
       po.actual_date,
       po.notes,
       po.created_at,
       po.supplier_id,
       sup.name  as supplier_name,
       sup.lead_time_days,
       po.site_id,
       s.code    as site_code,
       s.name    as site_name,
       coalesce(l.line_count, 0)        as line_count,
       coalesce(l.total_ordered, 0)     as total_ordered,
       coalesce(l.total_received, 0)    as total_received,
       coalesce(l.total_value, 0)       as total_value,
       coalesce(l.outstanding_qty, 0)   as outstanding_qty,
       case
         when po.expected_date is not null
          and po.expected_date < current_date
          and po.status in ('sent', 'partially_received')
         then true else false
       end as is_overdue
  from public.purchase_orders po
  join public.suppliers sup on sup.id = po.supplier_id
  join public.sites     s   on s.id   = po.site_id
  left join lateral (
    select count(*)                                          as line_count,
           sum(pol.qty_ordered)                              as total_ordered,
           sum(pol.qty_received)                             as total_received,
           sum(pol.qty_ordered * pol.unit_price)             as total_value,
           sum(pol.qty_ordered - pol.qty_received)           as outstanding_qty
      from public.purchase_order_lines pol
     where pol.purchase_order_id = po.id
  ) l on true;

-- Stock take headers with the variance already totalled, so the approval
-- queue can show impact without loading every line.
create view public.v_stock_take_summary
with (security_invoker = true) as
select st.id,
       st.reference,
       st.status,
       st.scope,
       st.started_at,
       st.submitted_at,
       st.approved_at,
       st.notes,
       st.site_id,
       s.code as site_code,
       s.name as site_name,
       c.name as category_name,
       st.bin_from,
       st.bin_to,
       starter.full_name  as started_by_name,
       approver.full_name as approved_by_name,
       coalesce(l.line_count, 0)        as line_count,
       coalesce(l.counted_count, 0)     as counted_count,
       coalesce(l.variance_lines, 0)    as variance_lines,
       coalesce(l.variance_qty, 0)      as variance_qty,
       coalesce(l.variance_value, 0)    as variance_value
  from public.stock_takes st
  join public.sites s on s.id = st.site_id
  left join public.categories c on c.id = st.category_id
  left join public.profiles starter  on starter.id  = st.started_by
  left join public.profiles approver on approver.id = st.approved_by
  left join lateral (
    select count(*)                                                as line_count,
           count(*) filter (where stl.counted_qty is not null)     as counted_count,
           count(*) filter (where stl.counted_qty is not null
                              and stl.variance <> 0)               as variance_lines,
           sum(case when stl.counted_qty is null then 0 else stl.variance end)  as variance_qty,
           round(sum(case when stl.counted_qty is null then 0
                          else stl.variance * stl.unit_cost end), 2)            as variance_value
      from public.stock_take_lines stl
     where stl.stock_take_id = st.id
  ) l on true;

-- Slow-moving / dead stock. Parameterised because "how long is dead"
-- differs per category in practice.
create or replace function public.dead_stock(
  p_days    integer default 90,
  p_site_id uuid default null
)
returns table (
  item_id          uuid,
  sku              text,
  description      text,
  category_name    text,
  site_id          uuid,
  site_code        text,
  bin_location     text,
  qty_on_hand      numeric,
  avg_cost         numeric,
  stock_value      numeric,
  last_movement_at timestamptz,
  days_since_movement integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select ss.item_id,
         ss.sku,
         ss.description,
         ss.category_name,
         ss.site_id,
         ss.site_code,
         ss.bin_location,
         ss.qty_on_hand,
         ss.avg_cost,
         ss.stock_value,
         ss.last_movement_at,
         case
           when ss.last_movement_at is null then null
           else extract(day from now() - ss.last_movement_at)::integer
         end as days_since_movement
    from public.v_stock_status ss
   where ss.qty_on_hand > 0
     and (p_site_id is null or ss.site_id = p_site_id)
     and (ss.last_movement_at is null or ss.last_movement_at < now() - make_interval(days => p_days))
   order by ss.stock_value desc nulls last;
$$;

grant execute on function public.dead_stock(integer, uuid) to authenticated;

grant select on public.v_stock_status           to authenticated;
grant select on public.v_reorder_suggestions    to authenticated;
grant select on public.v_stock_valuation        to authenticated;
grant select on public.v_movement_log           to authenticated;
grant select on public.v_purchase_order_summary to authenticated;
grant select on public.v_stock_take_summary     to authenticated;
