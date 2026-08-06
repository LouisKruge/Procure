-- NEXUS Stock :: 03 business logic
-- All stock movement flows through post_movement(). Nothing writes
-- stock_levels directly, so every quantity change leaves an audit row.

-- ------------------------------------------------------- access helpers
-- SECURITY DEFINER so RLS policies can call them without recursing back
-- into the profiles table they are protecting.

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and is_active;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

-- Admins and site supervisors both get cross-site visibility.
create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() in ('admin', 'site_supervisor'), false);
$$;

create or replace function public.has_site_access(p_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_manager()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and is_active and home_site_id = p_site_id
    )
    or exists (
      select 1 from public.user_sites
      where user_id = auth.uid() and site_id = p_site_id
    );
$$;

-- Every site the caller may touch. Used by list screens and RLS alike.
create or replace function public.accessible_site_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select s.id from public.sites s where public.is_manager()
  union
  select p.home_site_id from public.profiles p
    where p.id = auth.uid() and p.home_site_id is not null
  union
  select us.site_id from public.user_sites us where us.user_id = auth.uid();
$$;

-- --------------------------------------------------------- post_movement
-- The single chokepoint for stock quantity changes.
create or replace function public.post_movement(
  p_item_id        uuid,
  p_site_id        uuid,
  p_movement_type  public.movement_type,
  p_direction      public.movement_direction,
  p_qty            numeric,
  p_unit_cost      numeric default null,
  p_reason         text default null,
  p_reference_type text default null,
  p_reference_id   uuid default null,
  p_reference_no   text default null,
  p_allow_negative boolean default false
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_level      public.stock_levels;
  v_new_qty    numeric;
  v_movement   public.stock_movements;
  v_item       public.stock_items;
  v_total_qty  numeric;
  v_old_avg    numeric;
  v_new_avg    numeric;
  v_cost       numeric;
begin
  if not public.has_site_access(p_site_id) then
    raise exception 'You do not have access to this site.';
  end if;

  if p_qty is null or p_qty <= 0 then
    raise exception 'Quantity must be greater than zero.';
  end if;

  select * into v_item from public.stock_items where id = p_item_id;
  if not found then
    raise exception 'That stock item no longer exists.';
  end if;

  -- Lock (or create) the per-site level row so concurrent scans on the
  -- floor cannot interleave and lose a movement.
  insert into public.stock_levels (item_id, site_id, bin_location)
  values (p_item_id, p_site_id, v_item.default_bin)
  on conflict (item_id, site_id) do nothing;

  select * into v_level
    from public.stock_levels
   where item_id = p_item_id and site_id = p_site_id
     for update;

  v_cost := coalesce(p_unit_cost, v_item.avg_cost, 0);

  if p_direction = 'in' then
    v_new_qty := v_level.qty_on_hand + p_qty;
  else
    v_new_qty := v_level.qty_on_hand - p_qty;
    if v_new_qty < 0 and not p_allow_negative then
      raise exception
        'Only % % of % on hand at this site - cannot take out %.',
        v_level.qty_on_hand, v_item.uom, v_item.sku, p_qty;
    end if;
  end if;

  update public.stock_levels
     set qty_on_hand      = v_new_qty,
         last_movement_at = now()
   where id = v_level.id;

  -- Weighted average cost moves only when stock comes in at a known price.
  if p_direction = 'in' and p_unit_cost is not null and p_movement_type = 'receipt' then
    select coalesce(sum(qty_on_hand), 0) into v_total_qty
      from public.stock_levels where item_id = p_item_id;

    v_old_avg := coalesce(v_item.avg_cost, 0);
    -- v_total_qty already includes the receipt posted above.
    if v_total_qty > 0 then
      v_new_avg := (((v_total_qty - p_qty) * v_old_avg) + (p_qty * p_unit_cost)) / v_total_qty;
    else
      v_new_avg := p_unit_cost;
    end if;

    if round(v_new_avg, 4) is distinct from round(v_old_avg, 4) then
      update public.stock_items set avg_cost = round(v_new_avg, 4) where id = p_item_id;

      insert into public.cost_history (
        item_id, cost_type, old_cost, new_cost, qty_at_change,
        reason, reference_type, reference_id, changed_by
      ) values (
        p_item_id, 'average', v_old_avg, round(v_new_avg, 4), v_total_qty,
        coalesce(p_reason, 'Weighted average updated on receipt'),
        p_reference_type, p_reference_id, auth.uid()
      );
    end if;
  end if;

  insert into public.stock_movements (
    item_id, site_id, movement_type, direction, qty, qty_after, unit_cost,
    reason, reference_type, reference_id, reference_no, user_id
  ) values (
    p_item_id, p_site_id, p_movement_type, p_direction, p_qty, v_new_qty, v_cost,
    p_reason, p_reference_type, p_reference_id, p_reference_no, auth.uid()
  )
  returning * into v_movement;

  return v_movement;
end;
$$;

-- ------------------------------------------------------------ adjustments
create or replace function public.adjust_stock(
  p_item_id uuid,
  p_site_id uuid,
  p_new_qty numeric,
  p_reason  text
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current numeric;
  v_delta   numeric;
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'An adjustment needs a reason - nothing changes stock silently.';
  end if;

  select coalesce(qty_on_hand, 0) into v_current
    from public.stock_levels where item_id = p_item_id and site_id = p_site_id;
  v_current := coalesce(v_current, 0);
  v_delta := p_new_qty - v_current;

  if v_delta = 0 then
    raise exception 'That is already the quantity on hand - nothing to adjust.';
  end if;

  return public.post_movement(
    p_item_id, p_site_id, 'adjustment',
    case when v_delta > 0 then 'in' else 'out' end,
    abs(v_delta), null, p_reason, 'adjustment', null, null, true
  );
end;
$$;

-- --------------------------------------------------------------- receipts
-- Receive against an open PO. Partial receipts are the norm, so lines are
-- passed as [{line_id, qty, unit_price}] and the PO status is recomputed.
create or replace function public.receive_purchase_order(
  p_po_id uuid,
  p_lines jsonb,
  p_notes text default null
)
returns public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po       public.purchase_orders;
  v_line     public.purchase_order_lines;
  v_entry    jsonb;
  v_qty      numeric;
  v_price    numeric;
  v_outstanding numeric;
  v_received_any boolean := false;
begin
  select * into v_po from public.purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'That purchase order could not be found.';
  end if;
  if not public.has_site_access(v_po.site_id) then
    raise exception 'You do not have access to the site this PO delivers to.';
  end if;
  if v_po.status in ('draft', 'cancelled', 'closed') then
    raise exception 'PO % is % - it cannot be received against.', v_po.po_number, v_po.status;
  end if;

  for v_entry in select * from jsonb_array_elements(p_lines)
  loop
    v_qty := (v_entry ->> 'qty')::numeric;
    continue when v_qty is null or v_qty <= 0;

    select * into v_line
      from public.purchase_order_lines
     where id = (v_entry ->> 'line_id')::uuid and purchase_order_id = p_po_id
       for update;
    if not found then
      raise exception 'One of the lines you are receiving is not on this PO.';
    end if;

    v_outstanding := v_line.qty_ordered - v_line.qty_received;
    if v_qty > v_outstanding then
      raise exception 'Only % outstanding on %, you entered %.',
        v_outstanding, (select sku from public.stock_items where id = v_line.item_id), v_qty;
    end if;

    v_price := coalesce((v_entry ->> 'unit_price')::numeric, v_line.unit_price);

    perform public.post_movement(
      v_line.item_id, v_po.site_id, 'receipt', 'in', v_qty, v_price,
      coalesce(p_notes, 'Receipt against ' || v_po.po_number),
      'purchase_order', v_po.id, v_po.po_number
    );

    update public.purchase_order_lines
       set qty_received = qty_received + v_qty,
           unit_price   = v_price
     where id = v_line.id;

    update public.stock_levels
       set qty_on_order = greatest(qty_on_order - v_qty, 0)
     where item_id = v_line.item_id and site_id = v_po.site_id;

    -- Keep the supplier's last-known price current for procurement.
    insert into public.supplier_items (supplier_id, item_id, last_price, last_price_at)
    values (v_po.supplier_id, v_line.item_id, v_price, now())
    on conflict (supplier_id, item_id)
      do update set last_price = excluded.last_price, last_price_at = excluded.last_price_at;

    v_received_any := true;
  end loop;

  if not v_received_any then
    raise exception 'Nothing was entered to receive.';
  end if;

  select coalesce(sum(qty_ordered - qty_received), 0) into v_outstanding
    from public.purchase_order_lines where purchase_order_id = p_po_id;

  update public.purchase_orders
     set status      = case when v_outstanding <= 0 then 'received' else 'partially_received' end,
         actual_date = case when v_outstanding <= 0 then current_date else actual_date end
   where id = p_po_id
  returning * into v_po;

  return v_po;
end;
$$;

-- Ad-hoc receipt with no PO behind it (counter buy, return to stock, etc).
create or replace function public.receive_adhoc(
  p_item_id   uuid,
  p_site_id   uuid,
  p_qty       numeric,
  p_unit_cost numeric,
  p_reason    text
)
returns public.stock_movements
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'An ad-hoc receipt needs a reason so the audit trail makes sense later.';
  end if;
  return public.post_movement(
    p_item_id, p_site_id, 'receipt', 'in', p_qty, p_unit_cost, p_reason, 'adhoc', null, null
  );
end;
$$;

-- --------------------------------------------------------------- dispatch
create or replace function public.issue_dispatch(p_dispatch_id uuid)
returns public.dispatches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dispatch public.dispatches;
  v_line     record;
begin
  select * into v_dispatch from public.dispatches where id = p_dispatch_id for update;
  if not found then
    raise exception 'That dispatch note could not be found.';
  end if;
  if not public.has_site_access(v_dispatch.site_id) then
    raise exception 'You do not have access to this site.';
  end if;
  if v_dispatch.status <> 'draft' then
    raise exception 'Dispatch % has already been %.', v_dispatch.dispatch_number, v_dispatch.status;
  end if;
  if not exists (select 1 from public.dispatch_lines where dispatch_id = p_dispatch_id) then
    raise exception 'Add at least one item before issuing this dispatch.';
  end if;

  for v_line in
    select dl.*, si.avg_cost from public.dispatch_lines dl
      join public.stock_items si on si.id = dl.item_id
     where dl.dispatch_id = p_dispatch_id
  loop
    perform public.post_movement(
      v_line.item_id, v_dispatch.site_id, 'dispatch', 'out', v_line.qty, v_line.avg_cost,
      coalesce(nullif(v_dispatch.job_reference, ''), 'Dispatch'),
      'dispatch', v_dispatch.id, v_dispatch.dispatch_number
    );
    update public.dispatch_lines set unit_cost = v_line.avg_cost where id = v_line.id;
  end loop;

  update public.dispatches
     set status = 'issued', issued_at = now(), issued_by = auth.uid()
   where id = p_dispatch_id
  returning * into v_dispatch;

  return v_dispatch;
end;
$$;

-- -------------------------------------------------------------- transfers
create or replace function public.send_transfer(p_transfer_id uuid)
returns public.transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transfer public.transfers;
  v_line     record;
begin
  select * into v_transfer from public.transfers where id = p_transfer_id for update;
  if not found then
    raise exception 'That transfer could not be found.';
  end if;
  if not public.has_site_access(v_transfer.from_site_id) then
    raise exception 'You do not have access to the sending site.';
  end if;
  if v_transfer.status <> 'draft' then
    raise exception 'Transfer % has already been sent.', v_transfer.transfer_number;
  end if;
  if not exists (select 1 from public.transfer_lines where transfer_id = p_transfer_id) then
    raise exception 'Add at least one item before sending this transfer.';
  end if;

  for v_line in
    select tl.*, si.avg_cost from public.transfer_lines tl
      join public.stock_items si on si.id = tl.item_id
     where tl.transfer_id = p_transfer_id
  loop
    perform public.post_movement(
      v_line.item_id, v_transfer.from_site_id, 'transfer_out', 'out', v_line.qty_sent, v_line.avg_cost,
      'Transfer to ' || (select code from public.sites where id = v_transfer.to_site_id),
      'transfer', v_transfer.id, v_transfer.transfer_number
    );
    update public.transfer_lines set unit_cost = v_line.avg_cost where id = v_line.id;

    -- Visible as in-transit at the destination until it is booked in.
    insert into public.stock_levels (item_id, site_id, qty_in_transit)
    values (v_line.item_id, v_transfer.to_site_id, v_line.qty_sent)
    on conflict (item_id, site_id)
      do update set qty_in_transit = public.stock_levels.qty_in_transit + excluded.qty_in_transit;
  end loop;

  update public.transfers
     set status = 'in_transit', sent_at = now(), sent_by = auth.uid()
   where id = p_transfer_id
  returning * into v_transfer;

  return v_transfer;
end;
$$;

-- Confirm arrival. Short receipts are allowed and leave the shortfall
-- visible rather than silently writing it off.
create or replace function public.receive_transfer(
  p_transfer_id uuid,
  p_lines       jsonb default null
)
returns public.transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transfer public.transfers;
  v_line     record;
  v_qty      numeric;
begin
  select * into v_transfer from public.transfers where id = p_transfer_id for update;
  if not found then
    raise exception 'That transfer could not be found.';
  end if;
  if not public.has_site_access(v_transfer.to_site_id) then
    raise exception 'You do not have access to the receiving site.';
  end if;
  if v_transfer.status <> 'in_transit' then
    raise exception 'Transfer % is % - only in-transit transfers can be received.',
      v_transfer.transfer_number, v_transfer.status;
  end if;

  for v_line in select * from public.transfer_lines where transfer_id = p_transfer_id
  loop
    if p_lines is null then
      v_qty := v_line.qty_sent;
    else
      select (elem ->> 'qty')::numeric into v_qty
        from jsonb_array_elements(p_lines) elem
       where (elem ->> 'line_id')::uuid = v_line.id;
      v_qty := coalesce(v_qty, v_line.qty_sent);
    end if;

    if v_qty < 0 or v_qty > v_line.qty_sent then
      raise exception 'You can receive between 0 and % on each line.', v_line.qty_sent;
    end if;

    if v_qty > 0 then
      perform public.post_movement(
        v_line.item_id, v_transfer.to_site_id, 'transfer_in', 'in', v_qty, v_line.unit_cost,
        'Transfer from ' || (select code from public.sites where id = v_transfer.from_site_id),
        'transfer', v_transfer.id, v_transfer.transfer_number
      );
    end if;

    update public.transfer_lines set qty_received = v_qty where id = v_line.id;

    update public.stock_levels
       set qty_in_transit = greatest(qty_in_transit - v_line.qty_sent, 0)
     where item_id = v_line.item_id and site_id = v_transfer.to_site_id;
  end loop;

  update public.transfers
     set status = 'received', received_at = now(), received_by = auth.uid()
   where id = p_transfer_id
  returning * into v_transfer;

  return v_transfer;
end;
$$;

-- ------------------------------------------------------------ stock takes
-- Snapshot expected quantities at the moment counting starts, so the
-- variance is measured against what the system believed at that time.
create or replace function public.start_stock_take(
  p_site_id     uuid,
  p_scope       public.stock_take_scope default 'full',
  p_category_id uuid default null,
  p_bin_from    text default null,
  p_bin_to      text default null,
  p_notes       text default null
)
returns public.stock_takes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_take public.stock_takes;
begin
  if not public.has_site_access(p_site_id) then
    raise exception 'You do not have access to this site.';
  end if;

  insert into public.stock_takes (site_id, scope, category_id, bin_from, bin_to, notes, status, started_by)
  values (p_site_id, p_scope, p_category_id, p_bin_from, p_bin_to, p_notes, 'counting', auth.uid())
  returning * into v_take;

  insert into public.stock_take_lines (stock_take_id, item_id, bin_location, expected_qty, unit_cost)
  select v_take.id,
         si.id,
         coalesce(sl.bin_location, si.default_bin),
         coalesce(sl.qty_on_hand, 0),
         si.avg_cost
    from public.stock_items si
    left join public.stock_levels sl
      on sl.item_id = si.id and sl.site_id = p_site_id
   where si.is_active
     and (
       p_scope = 'full'
       or (p_scope = 'category' and si.category_id = p_category_id)
       or (p_scope = 'bin_range'
           and coalesce(sl.bin_location, si.default_bin) between p_bin_from and p_bin_to)
     );

  return v_take;
end;
$$;

create or replace function public.submit_stock_take(p_stock_take_id uuid)
returns public.stock_takes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_take public.stock_takes;
begin
  select * into v_take from public.stock_takes where id = p_stock_take_id for update;
  if not found then
    raise exception 'That stock take could not be found.';
  end if;
  if not public.has_site_access(v_take.site_id) then
    raise exception 'You do not have access to this site.';
  end if;
  if v_take.status <> 'counting' then
    raise exception 'Stock take % is % and cannot be submitted.', v_take.reference, v_take.status;
  end if;
  if not exists (
    select 1 from public.stock_take_lines
     where stock_take_id = p_stock_take_id and counted_qty is not null
  ) then
    raise exception 'Count at least one line before submitting for approval.';
  end if;

  update public.stock_takes
     set status = 'pending_approval', submitted_at = now()
   where id = p_stock_take_id
  returning * into v_take;

  return v_take;
end;
$$;

-- Supervisor gate. Variances only hit stock_levels here, and each one
-- posts its own movement so the correction is never silent.
create or replace function public.approve_stock_take(p_stock_take_id uuid)
returns public.stock_takes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_take public.stock_takes;
  v_line record;
begin
  if not public.is_manager() then
    raise exception 'Only a supervisor or admin can approve a stock take.';
  end if;

  select * into v_take from public.stock_takes where id = p_stock_take_id for update;
  if not found then
    raise exception 'That stock take could not be found.';
  end if;
  if v_take.status <> 'pending_approval' then
    raise exception 'Stock take % is % - only counts awaiting approval can be approved.',
      v_take.reference, v_take.status;
  end if;

  for v_line in
    select * from public.stock_take_lines
     where stock_take_id = p_stock_take_id
       and counted_qty is not null
       and variance <> 0
  loop
    perform public.post_movement(
      v_line.item_id, v_take.site_id, 'stock_take',
      case when v_line.variance > 0 then 'in' else 'out' end,
      abs(v_line.variance), v_line.unit_cost,
      'Stock take correction (' || v_take.reference || ')',
      'stock_take', v_take.id, v_take.reference, true
    );
  end loop;

  update public.stock_takes
     set status = 'approved', approved_at = now(), approved_by = auth.uid()
   where id = p_stock_take_id
  returning * into v_take;

  return v_take;
end;
$$;

-- ------------------------------------------------------------ procurement
-- Turn reorder suggestions into draft POs, one per supplier.
-- p_items: [{item_id, qty, supplier_id, unit_price}]
create or replace function public.create_purchase_orders_from_suggestions(
  p_site_id uuid,
  p_items   jsonb,
  p_notes   text default null
)
returns setof public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_entry       jsonb;
  v_supplier_id uuid;
  v_po_id       uuid;
  v_qty         numeric;
  v_price       numeric;
  v_line_no     integer;
  v_supplier_pos jsonb := '{}'::jsonb;
begin
  if not public.has_site_access(p_site_id) then
    raise exception 'You do not have access to this site.';
  end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Select at least one item to order.';
  end if;

  for v_entry in select * from jsonb_array_elements(p_items)
  loop
    v_supplier_id := (v_entry ->> 'supplier_id')::uuid;
    v_qty := (v_entry ->> 'qty')::numeric;
    if v_supplier_id is null then
      raise exception 'Every line needs a supplier before a PO can be raised.';
    end if;
    continue when v_qty is null or v_qty <= 0;

    if v_supplier_pos ? v_supplier_id::text then
      v_po_id := (v_supplier_pos ->> v_supplier_id::text)::uuid;
    else
      insert into public.purchase_orders (supplier_id, site_id, status, notes, created_by, expected_date)
      values (
        v_supplier_id, p_site_id, 'draft', p_notes, auth.uid(),
        current_date + coalesce((select lead_time_days from public.suppliers where id = v_supplier_id), 7)
      )
      returning id into v_po_id;
      v_supplier_pos := v_supplier_pos || jsonb_build_object(v_supplier_id::text, v_po_id);
    end if;

    select coalesce(max(line_no), 0) + 1 into v_line_no
      from public.purchase_order_lines where purchase_order_id = v_po_id;

    v_price := coalesce(
      (v_entry ->> 'unit_price')::numeric,
      (select last_price from public.supplier_items
        where supplier_id = v_supplier_id and item_id = (v_entry ->> 'item_id')::uuid),
      (select avg_cost from public.stock_items where id = (v_entry ->> 'item_id')::uuid),
      0
    );

    insert into public.purchase_order_lines (
      purchase_order_id, item_id, line_no, qty_ordered, unit_price, supplier_part_no
    ) values (
      v_po_id, (v_entry ->> 'item_id')::uuid, v_line_no, v_qty, v_price,
      (select supplier_part_no from public.supplier_items
        where supplier_id = v_supplier_id and item_id = (v_entry ->> 'item_id')::uuid)
    );
  end loop;

  return query
    select * from public.purchase_orders
     where id in (select (value #>> '{}')::uuid from jsonb_each(v_supplier_pos));
end;
$$;

create or replace function public.send_purchase_order(p_po_id uuid)
returns public.purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_po   public.purchase_orders;
  v_line record;
begin
  select * into v_po from public.purchase_orders where id = p_po_id for update;
  if not found then
    raise exception 'That purchase order could not be found.';
  end if;
  if not public.has_site_access(v_po.site_id) then
    raise exception 'You do not have access to this site.';
  end if;
  if v_po.status <> 'draft' then
    raise exception 'PO % has already been sent.', v_po.po_number;
  end if;
  if not exists (select 1 from public.purchase_order_lines where purchase_order_id = p_po_id) then
    raise exception 'Add at least one line before sending this PO.';
  end if;

  -- Reflect the incoming quantity so reorder suggestions stop re-suggesting.
  for v_line in select * from public.purchase_order_lines where purchase_order_id = p_po_id
  loop
    insert into public.stock_levels (item_id, site_id, qty_on_order)
    values (v_line.item_id, v_po.site_id, v_line.qty_ordered)
    on conflict (item_id, site_id)
      do update set qty_on_order = public.stock_levels.qty_on_order + excluded.qty_on_order;
  end loop;

  update public.purchase_orders
     set status = 'sent', sent_at = now()
   where id = p_po_id
  returning * into v_po;

  return v_po;
end;
$$;

-- ------------------------------------------------------------- item costs
create or replace function public.set_standard_cost(
  p_item_id uuid,
  p_cost    numeric,
  p_reason  text default null
)
returns public.stock_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.stock_items;
  v_old  numeric;
begin
  if not public.is_manager() then
    raise exception 'Only a supervisor or admin can change standard cost.';
  end if;

  select standard_cost into v_old from public.stock_items where id = p_item_id;
  if not found then
    raise exception 'That stock item could not be found.';
  end if;

  update public.stock_items set standard_cost = p_cost where id = p_item_id
  returning * into v_item;

  insert into public.cost_history (item_id, cost_type, old_cost, new_cost, reason, changed_by)
  values (p_item_id, 'standard', v_old, p_cost, coalesce(p_reason, 'Standard cost updated'), auth.uid());

  return v_item;
end;
$$;

-- ----------------------------------------------------------------- search
-- Trigram-ranked fuzzy search across SKU, description and barcode.
-- An exact SKU or barcode hit always sorts first so a scanner lands
-- straight on the right item.
create or replace function public.search_stock_items(
  p_query text,
  p_limit integer default 25
)
returns table (
  id            uuid,
  sku           text,
  description   text,
  uom           text,
  barcode       text,
  category_name text,
  avg_cost      numeric,
  reorder_point numeric,
  total_on_hand numeric,
  score         real
)
language sql
stable
security definer
set search_path = public
as $$
  with q as (select coalesce(trim(p_query), '') as term)
  select si.id,
         si.sku,
         si.description,
         si.uom,
         si.barcode,
         c.name as category_name,
         si.avg_cost,
         si.reorder_point,
         coalesce((
           select sum(sl.qty_on_hand) from public.stock_levels sl
            where sl.item_id = si.id
              and sl.site_id in (select public.accessible_site_ids())
         ), 0) as total_on_hand,
         greatest(
           similarity(si.sku, q.term),
           similarity(si.description, q.term),
           case when si.barcode = q.term then 1.0 else 0 end,
           case when upper(si.sku) = upper(q.term) then 1.0 else 0 end
         )::real as score
    from public.stock_items si
    cross join q
    left join public.categories c on c.id = si.category_id
   where si.is_active
     and (
       q.term = ''
       or si.barcode = q.term
       or si.sku ilike '%' || q.term || '%'
       or si.description ilike '%' || q.term || '%'
       or similarity(si.sku, q.term) > 0.2
       or similarity(si.description, q.term) > 0.2
     )
   order by score desc, si.sku
   limit greatest(p_limit, 1);
$$;
