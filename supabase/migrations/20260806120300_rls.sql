-- NEXUS Stock :: 04 row level security
--
-- Shape of the policy set:
--   * Reference data (sites, categories, suppliers, items) is readable by
--     every signed-in user; only managers may edit it.
--   * Anything site-scoped is filtered through accessible_site_ids(), so a
--     staff member sees only their own site(s) while admins and site
--     supervisors see all five.
--   * Tables that represent posted stock (stock_levels, stock_movements,
--     cost_history) have NO write policies at all. They are written only by
--     the SECURITY DEFINER functions in migration 03, which is what makes
--     the audit trail impossible to route around from the client.

alter table public.sites                enable row level security;
alter table public.profiles             enable row level security;
alter table public.user_sites           enable row level security;
alter table public.categories           enable row level security;
alter table public.suppliers            enable row level security;
alter table public.stock_items          enable row level security;
alter table public.supplier_items       enable row level security;
alter table public.stock_levels         enable row level security;
alter table public.stock_movements      enable row level security;
alter table public.purchase_orders      enable row level security;
alter table public.purchase_order_lines enable row level security;
alter table public.dispatches           enable row level security;
alter table public.dispatch_lines       enable row level security;
alter table public.transfers            enable row level security;
alter table public.transfer_lines       enable row level security;
alter table public.stock_takes          enable row level security;
alter table public.stock_take_lines     enable row level security;
alter table public.cost_history         enable row level security;

-- ---------------------------------------------------------------- sites
create policy sites_read on public.sites
  for select to authenticated using (true);
create policy sites_write on public.sites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------- profiles
create policy profiles_read_self on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_manager());
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());
create policy profiles_admin_write on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy user_sites_read on public.user_sites
  for select to authenticated using (user_id = auth.uid() or public.is_manager());
create policy user_sites_admin_write on public.user_sites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- --------------------------------------------------- reference data
create policy categories_read on public.categories
  for select to authenticated using (true);
create policy categories_write on public.categories
  for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy suppliers_read on public.suppliers
  for select to authenticated using (true);
create policy suppliers_write on public.suppliers
  for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy stock_items_read on public.stock_items
  for select to authenticated using (true);
create policy stock_items_write on public.stock_items
  for all to authenticated using (public.is_manager()) with check (public.is_manager());

create policy supplier_items_read on public.supplier_items
  for select to authenticated using (true);
create policy supplier_items_write on public.supplier_items
  for all to authenticated using (public.is_manager()) with check (public.is_manager());

-- ------------------------------------------------- posted stock (read only)
create policy stock_levels_read on public.stock_levels
  for select to authenticated
  using (site_id in (select public.accessible_site_ids()));

create policy stock_movements_read on public.stock_movements
  for select to authenticated
  using (site_id in (select public.accessible_site_ids()));

create policy cost_history_read on public.cost_history
  for select to authenticated using (true);

-- ------------------------------------------------------- purchase orders
create policy purchase_orders_read on public.purchase_orders
  for select to authenticated
  using (site_id in (select public.accessible_site_ids()));
create policy purchase_orders_insert on public.purchase_orders
  for insert to authenticated
  with check (public.has_site_access(site_id));
create policy purchase_orders_update on public.purchase_orders
  for update to authenticated
  using (public.has_site_access(site_id))
  with check (public.has_site_access(site_id));
create policy purchase_orders_delete on public.purchase_orders
  for delete to authenticated
  using (public.has_site_access(site_id) and status = 'draft');

create policy po_lines_read on public.purchase_order_lines
  for select to authenticated
  using (exists (
    select 1 from public.purchase_orders po
     where po.id = purchase_order_id
       and po.site_id in (select public.accessible_site_ids())
  ));
-- Lines are editable only while the PO is still a draft; once it is sent,
-- quantities move through receive_purchase_order() instead.
create policy po_lines_write on public.purchase_order_lines
  for all to authenticated
  using (exists (
    select 1 from public.purchase_orders po
     where po.id = purchase_order_id
       and public.has_site_access(po.site_id)
       and po.status = 'draft'
  ))
  with check (exists (
    select 1 from public.purchase_orders po
     where po.id = purchase_order_id
       and public.has_site_access(po.site_id)
       and po.status = 'draft'
  ));

-- ------------------------------------------------------------ dispatches
create policy dispatches_read on public.dispatches
  for select to authenticated
  using (site_id in (select public.accessible_site_ids()));
create policy dispatches_insert on public.dispatches
  for insert to authenticated with check (public.has_site_access(site_id));
create policy dispatches_update on public.dispatches
  for update to authenticated
  using (public.has_site_access(site_id) and status = 'draft')
  with check (public.has_site_access(site_id));
create policy dispatches_delete on public.dispatches
  for delete to authenticated
  using (public.has_site_access(site_id) and status = 'draft');

create policy dispatch_lines_read on public.dispatch_lines
  for select to authenticated
  using (exists (
    select 1 from public.dispatches d
     where d.id = dispatch_id and d.site_id in (select public.accessible_site_ids())
  ));
create policy dispatch_lines_write on public.dispatch_lines
  for all to authenticated
  using (exists (
    select 1 from public.dispatches d
     where d.id = dispatch_id and public.has_site_access(d.site_id) and d.status = 'draft'
  ))
  with check (exists (
    select 1 from public.dispatches d
     where d.id = dispatch_id and public.has_site_access(d.site_id) and d.status = 'draft'
  ));

-- ------------------------------------------------------------- transfers
-- Both ends of a transfer can see it, otherwise the receiving site could
-- not tell what is on its way.
create policy transfers_read on public.transfers
  for select to authenticated
  using (
    from_site_id in (select public.accessible_site_ids())
    or to_site_id in (select public.accessible_site_ids())
  );
create policy transfers_insert on public.transfers
  for insert to authenticated with check (public.has_site_access(from_site_id));
create policy transfers_update on public.transfers
  for update to authenticated
  using (public.has_site_access(from_site_id) and status = 'draft')
  with check (public.has_site_access(from_site_id));
create policy transfers_delete on public.transfers
  for delete to authenticated
  using (public.has_site_access(from_site_id) and status = 'draft');

create policy transfer_lines_read on public.transfer_lines
  for select to authenticated
  using (exists (
    select 1 from public.transfers t
     where t.id = transfer_id
       and (t.from_site_id in (select public.accessible_site_ids())
            or t.to_site_id in (select public.accessible_site_ids()))
  ));
create policy transfer_lines_write on public.transfer_lines
  for all to authenticated
  using (exists (
    select 1 from public.transfers t
     where t.id = transfer_id and public.has_site_access(t.from_site_id) and t.status = 'draft'
  ))
  with check (exists (
    select 1 from public.transfers t
     where t.id = transfer_id and public.has_site_access(t.from_site_id) and t.status = 'draft'
  ));

-- ------------------------------------------------------------ stock takes
create policy stock_takes_read on public.stock_takes
  for select to authenticated
  using (site_id in (select public.accessible_site_ids()));
create policy stock_takes_update on public.stock_takes
  for update to authenticated
  using (public.has_site_access(site_id) and status in ('draft', 'counting'))
  with check (public.has_site_access(site_id));

create policy stock_take_lines_read on public.stock_take_lines
  for select to authenticated
  using (exists (
    select 1 from public.stock_takes st
     where st.id = stock_take_id and st.site_id in (select public.accessible_site_ids())
  ));
-- Counters may only write counted quantities, and only while the session
-- is open. Approval (and the resulting adjustments) is a separate,
-- supervisor-gated function.
create policy stock_take_lines_update on public.stock_take_lines
  for update to authenticated
  using (exists (
    select 1 from public.stock_takes st
     where st.id = stock_take_id
       and public.has_site_access(st.site_id)
       and st.status = 'counting'
  ))
  with check (exists (
    select 1 from public.stock_takes st
     where st.id = stock_take_id
       and public.has_site_access(st.site_id)
       and st.status = 'counting'
  ));

-- ------------------------------------------------------------ function acl
revoke all on function public.post_movement(uuid, uuid, public.movement_type, public.movement_direction, numeric, numeric, text, text, uuid, text, boolean) from public;
grant execute on function public.post_movement(uuid, uuid, public.movement_type, public.movement_direction, numeric, numeric, text, text, uuid, text, boolean) to authenticated;

grant execute on function public.current_user_role()                       to authenticated;
grant execute on function public.is_admin()                                to authenticated;
grant execute on function public.is_manager()                              to authenticated;
grant execute on function public.has_site_access(uuid)                     to authenticated;
grant execute on function public.accessible_site_ids()                     to authenticated;
grant execute on function public.adjust_stock(uuid, uuid, numeric, text)   to authenticated;
grant execute on function public.receive_purchase_order(uuid, jsonb, text) to authenticated;
grant execute on function public.receive_adhoc(uuid, uuid, numeric, numeric, text) to authenticated;
grant execute on function public.issue_dispatch(uuid)                      to authenticated;
grant execute on function public.send_transfer(uuid)                       to authenticated;
grant execute on function public.receive_transfer(uuid, jsonb)             to authenticated;
grant execute on function public.start_stock_take(uuid, public.stock_take_scope, uuid, text, text, text) to authenticated;
grant execute on function public.submit_stock_take(uuid)                   to authenticated;
grant execute on function public.approve_stock_take(uuid)                  to authenticated;
grant execute on function public.create_purchase_orders_from_suggestions(uuid, jsonb, text) to authenticated;
grant execute on function public.send_purchase_order(uuid)                 to authenticated;
grant execute on function public.set_standard_cost(uuid, numeric, text)    to authenticated;
grant execute on function public.search_stock_items(text, integer)         to authenticated;
