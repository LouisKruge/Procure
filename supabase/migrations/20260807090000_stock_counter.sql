-- NEXUS Stock :: 12 the stock counter
--
-- The store counter is the one screen that gets used a hundred times a day:
-- someone walks up, names a part or reads a bin, takes a quantity, and it
-- comes off. The full dispatch-note flow is the right tool for a job issue
-- with a works order behind it, but it is far too much ceremony for "three
-- gloves off the shelf".
--
-- Two functions back that screen:
--
--   counter_search  finds an item at a specific site by code, description,
--                   barcode, bin or location, and returns what is actually
--                   on the shelf there.
--   counter_post    books one line in or out, through post_movement like
--                   everything else, so the audit trail is identical to a
--                   dispatch note or a purchase receipt.
--
-- Nothing here writes to stock_levels directly. post_movement remains the
-- only path that changes a quantity.

-- ------------------------------------------------------------------ search
create or replace function public.counter_search(
  p_site_id uuid,
  p_query   text,
  p_limit   integer default 20
)
returns table (
  item_id       uuid,
  sku           text,
  description   text,
  uom           text,
  barcode       text,
  bin_location  text,
  location      text,
  category_name text,
  qty_on_hand   numeric,
  reorder_point numeric,
  avg_cost      numeric,
  stock_status  text,
  score         real
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (select coalesce(trim(p_query), '') as term)
  select si.id as item_id,
         si.sku,
         si.description,
         si.uom,
         si.barcode,
         coalesce(sl.bin_location, si.default_bin)      as bin_location,
         coalesce(sl.location, si.default_location)     as location,
         c.name                                         as category_name,
         coalesce(sl.qty_on_hand, 0)                    as qty_on_hand,
         si.reorder_point,
         si.avg_cost,
         case
           when coalesce(sl.qty_on_hand, 0) <= 0 then 'out'
           when coalesce(sl.qty_on_hand, 0) <= si.reorder_point then 'low'
           else 'ok'
         end as stock_status,
         -- An exact barcode or bin match beats everything: a scan or a
         -- shelf label should land on one row, not a ranked list.
         greatest(
           case when si.barcode = q.term then 1.0 else 0 end,
           case when upper(si.sku) = upper(q.term) then 1.0 else 0 end,
           case when upper(coalesce(sl.bin_location, si.default_bin)) = upper(q.term)
                then 0.95 else 0 end,
           similarity(si.sku, q.term),
           similarity(si.description, q.term)
         )::real as score
    from public.stock_items si
    cross join q
    left join public.stock_levels sl
           on sl.item_id = si.id and sl.site_id = p_site_id
    left join public.categories c on c.id = si.category_id
   where si.is_active
     and public.has_site_access(p_site_id)
     and (
       q.term = ''
       or si.barcode = q.term
       or si.sku ilike '%' || q.term || '%'
       or si.description ilike '%' || q.term || '%'
       or coalesce(sl.bin_location, si.default_bin) ilike q.term || '%'
       or coalesce(sl.location, si.default_location) ilike q.term || '%'
       or similarity(si.sku, q.term) > 0.2
       or similarity(si.description, q.term) > 0.2
     )
   order by score desc, coalesce(sl.qty_on_hand, 0) desc, si.sku
   limit greatest(p_limit, 1);
$$;

comment on function public.counter_search is
  'Site-scoped item lookup for the stock counter: code, description, barcode, bin or location.';

-- -------------------------------------------------------------------- post
create or replace function public.counter_post(
  p_item_id   uuid,
  p_site_id   uuid,
  p_direction public.movement_direction,
  p_qty       numeric,
  p_reason    text default null,
  p_reference text default null
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qty numeric := round(coalesce(p_qty, 0), 4);
begin
  if v_qty <= 0 then
    raise exception 'Enter a quantity greater than zero.';
  end if;

  -- An issue is a dispatch and a return is a receipt. Reusing the existing
  -- movement types keeps counter activity in the same reports as everything
  -- else rather than creating a second, parallel history.
  return public.post_movement(
    p_item_id,
    p_site_id,
    (case when p_direction = 'out' then 'dispatch' else 'receipt' end)::public.movement_type,
    p_direction,
    v_qty,
    null,
    nullif(trim(coalesce(p_reason, '')), ''),
    'counter',
    null,
    nullif(trim(coalesce(p_reference, '')), '')
  );
end;
$$;

comment on function public.counter_post is
  'Books a single line in or out from the stock counter, through post_movement.';

revoke all on function public.counter_search(uuid, text, integer) from public, anon;
revoke all on function public.counter_post(uuid, uuid, public.movement_direction, numeric, text, text)
  from public, anon;
grant execute on function public.counter_search(uuid, text, integer) to authenticated;
grant execute on function public.counter_post(uuid, uuid, public.movement_direction, numeric, text, text)
  to authenticated;
