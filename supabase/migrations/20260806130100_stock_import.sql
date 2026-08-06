-- NEXUS Stock :: 11 bulk stock import
--
-- Upserts the whole chain from one spreadsheet row: category group -> type
-- subcategory -> supplier -> item -> per-site level. Re-running with an
-- updated sheet updates in place rather than duplicating, which is the
-- point: the source workbook is revised monthly.
--
-- Quantity differences post as logged adjustments through post_movement(),
-- never as a silent overwrite, so a re-import still leaves an audit trail.

create or replace function public.import_stock_rows(
  p_site_id uuid,
  p_rows    jsonb,
  p_adjust_quantities boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_row      jsonb;
  v_group_id uuid;
  v_cat_id   uuid;
  v_sup_id   uuid;
  v_item     public.stock_items;
  v_level    public.stock_levels;
  v_sku      text;
  v_desc     text;
  v_group    text;
  v_type     text;
  v_supplier text;
  v_qty      numeric;
  v_price    numeric;
  v_created  integer := 0;
  v_updated  integer := 0;
  v_adjusted integer := 0;
  v_skipped  integer := 0;
begin
  if not public.is_manager() then
    raise exception 'Only a supervisor or admin can import stock.';
  end if;
  if not public.has_site_access(p_site_id) then
    raise exception 'You do not have access to this site.';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows)
  loop
    v_sku  := nullif(trim(v_row ->> 'sku'), '');
    v_desc := nullif(trim(v_row ->> 'description'), '');

    if v_sku is null and v_desc is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    -- A sheet without stock codes still imports: the description becomes one.
    v_sku  := coalesce(v_sku, upper(left(regexp_replace(v_desc, '[^a-zA-Z0-9]+', '-', 'g'), 40)));
    v_desc := coalesce(v_desc, v_sku);

    v_group    := nullif(trim(v_row ->> 'group'), '');
    v_type     := nullif(trim(v_row ->> 'type'), '');
    v_supplier := nullif(trim(v_row ->> 'supplier'), '');
    v_qty      := coalesce((nullif(v_row ->> 'qty', ''))::numeric, 0);
    v_price    := (nullif(v_row ->> 'price', ''))::numeric;

    -- Top-level group, e.g. Consumables / Fittings.
    v_group_id := null;
    if v_group is not null then
      select id into v_group_id from public.categories
       where parent_id is null and lower(name) = lower(v_group);
      if v_group_id is null then
        insert into public.categories (code, name)
        values (upper(left(regexp_replace(v_group, '[^a-zA-Z0-9]+', '', 'g'), 20)), v_group)
        on conflict (code) do update set name = excluded.name
        returning id into v_group_id;
      end if;
    end if;

    -- Subcategory, e.g. Hex Bolt. Falls back to the group.
    v_cat_id := v_group_id;
    if v_type is not null then
      select id into v_cat_id from public.categories
       where parent_id = v_group_id and lower(name) = lower(v_type);
      if v_cat_id is null then
        insert into public.categories (code, name, parent_id)
        values (
          upper(left(regexp_replace(coalesce(v_group,'') || '-' || v_type, '[^a-zA-Z0-9]+', '', 'g'), 24)),
          v_type, v_group_id
        )
        on conflict (code) do update set name = excluded.name
        returning id into v_cat_id;
        v_cat_id := coalesce(v_cat_id, v_group_id);
      end if;
    end if;

    v_sup_id := null;
    if v_supplier is not null then
      select id into v_sup_id from public.suppliers where lower(name) = lower(v_supplier);
      if v_sup_id is null then
        insert into public.suppliers (code, name)
        values (upper(left(regexp_replace(v_supplier, '[^a-zA-Z0-9]+', '', 'g'), 20)), v_supplier)
        on conflict (code) do update set name = excluded.name
        returning id into v_sup_id;
      end if;
    end if;

    select * into v_item from public.stock_items where sku = v_sku;

    if not found then
      insert into public.stock_items (
        sku, description, category_id, uom, default_bin, default_location,
        reorder_point, reorder_qty, standard_cost, avg_cost, default_supplier_id
      ) values (
        v_sku, v_desc, v_cat_id,
        coalesce(nullif(trim(v_row ->> 'uom'), ''), 'EA'),
        nullif(trim(v_row ->> 'bin'), ''),
        nullif(trim(v_row ->> 'location'), ''),
        coalesce((nullif(v_row ->> 'min_qty', ''))::numeric, 0),
        coalesce((nullif(v_row ->> 'order_qty', ''))::numeric, 0),
        coalesce(v_price, 0), coalesce(v_price, 0), v_sup_id
      )
      returning * into v_item;
      v_created := v_created + 1;
    else
      update public.stock_items
         set description      = v_desc,
             category_id      = coalesce(v_cat_id, category_id),
             uom              = coalesce(nullif(trim(v_row ->> 'uom'), ''), uom),
             default_bin      = coalesce(nullif(trim(v_row ->> 'bin'), ''), default_bin),
             default_location = coalesce(nullif(trim(v_row ->> 'location'), ''), default_location),
             reorder_point    = coalesce((nullif(v_row ->> 'min_qty', ''))::numeric, reorder_point),
             reorder_qty      = coalesce((nullif(v_row ->> 'order_qty', ''))::numeric, reorder_qty),
             standard_cost    = coalesce(v_price, standard_cost),
             -- Never clobber a weighted average earned from real receipts.
             avg_cost         = case when avg_cost = 0 then coalesce(v_price, 0) else avg_cost end,
             default_supplier_id = coalesce(v_sup_id, default_supplier_id)
       where id = v_item.id
      returning * into v_item;
      v_updated := v_updated + 1;
    end if;

    if v_sup_id is not null then
      insert into public.supplier_items (supplier_id, item_id, last_price, last_price_at, is_preferred)
      values (v_sup_id, v_item.id, v_price, case when v_price is not null then now() end, true)
      on conflict (supplier_id, item_id) do update
        set last_price    = coalesce(excluded.last_price, public.supplier_items.last_price),
            last_price_at = coalesce(excluded.last_price_at, public.supplier_items.last_price_at);
    end if;

    insert into public.stock_levels (item_id, site_id, bin_location, location, qty_on_hand)
    values (
      v_item.id, p_site_id,
      nullif(trim(v_row ->> 'bin'), ''),
      nullif(trim(v_row ->> 'location'), ''),
      0
    )
    on conflict (item_id, site_id) do update
      set bin_location = coalesce(excluded.bin_location, public.stock_levels.bin_location),
          location     = coalesce(excluded.location, public.stock_levels.location)
    returning * into v_level;

    -- Bring the level to the sheet quantity through the audited path. The
    -- enum casts are load-bearing: a bare CASE yields text and will not
    -- resolve against post_movement's signature.
    if p_adjust_quantities and v_qty is distinct from v_level.qty_on_hand then
      perform public.post_movement(
        v_item.id,
        p_site_id,
        'adjustment'::public.movement_type,
        (case when v_qty > v_level.qty_on_hand then 'in' else 'out' end)::public.movement_direction,
        abs(v_qty - v_level.qty_on_hand),
        coalesce(v_price, v_item.avg_cost),
        'Stock import from spreadsheet',
        'import',
        null::uuid,
        null::text,
        true
      );
      v_adjusted := v_adjusted + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'created', v_created, 'updated', v_updated,
    'adjusted', v_adjusted, 'skipped', v_skipped
  );
end;
$fn$;

revoke all on function public.import_stock_rows(uuid, jsonb, boolean) from public, anon;
grant execute on function public.import_stock_rows(uuid, jsonb, boolean) to authenticated;
