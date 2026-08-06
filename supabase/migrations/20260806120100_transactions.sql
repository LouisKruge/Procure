-- NEXUS Stock :: 02 transactional tables
-- Movements (the audit spine), purchase orders, dispatches, transfers,
-- stock takes and cost history.

-- ------------------------------------------------------- document numbers
-- Human-readable sequential references, e.g. PO-000123.
create sequence public.po_number_seq        start 1000;
create sequence public.dispatch_number_seq  start 1000;
create sequence public.transfer_number_seq  start 1000;
create sequence public.stock_take_number_seq start 1000;

-- ------------------------------------------------------- purchase_orders
create table public.purchase_orders (
  id            uuid primary key default gen_random_uuid(),
  po_number     text not null unique default 'PO-' || lpad(nextval('public.po_number_seq')::text, 6, '0'),
  supplier_id   uuid not null references public.suppliers(id) on delete restrict,
  site_id       uuid not null references public.sites(id) on delete restrict,
  status        public.po_status not null default 'draft',
  order_date    date not null default current_date,
  expected_date date,
  actual_date   date,
  notes         text,
  created_by    uuid references public.profiles(id) on delete set null,
  sent_at       timestamptz,
  closed_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index purchase_orders_supplier_idx on public.purchase_orders (supplier_id);
create index purchase_orders_site_idx     on public.purchase_orders (site_id);
create index purchase_orders_status_idx   on public.purchase_orders (status);
create trigger purchase_orders_touch before update on public.purchase_orders
  for each row execute function public.touch_updated_at();

create table public.purchase_order_lines (
  id                uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  item_id           uuid not null references public.stock_items(id) on delete restrict,
  line_no           integer not null default 1,
  qty_ordered       numeric(18, 4) not null check (qty_ordered > 0),
  qty_received      numeric(18, 4) not null default 0,
  unit_price        numeric(18, 4) not null default 0,
  supplier_part_no  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index po_lines_po_idx   on public.purchase_order_lines (purchase_order_id);
create index po_lines_item_idx on public.purchase_order_lines (item_id);
create trigger po_lines_touch before update on public.purchase_order_lines
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------- dispatches
create table public.dispatches (
  id              uuid primary key default gen_random_uuid(),
  dispatch_number text not null unique default 'DN-' || lpad(nextval('public.dispatch_number_seq')::text, 6, '0'),
  site_id         uuid not null references public.sites(id) on delete restrict,
  status          public.dispatch_status not null default 'draft',
  job_reference   text,
  cost_center     text,
  customer        text,
  authorized_by   text,
  notes           text,
  created_by      uuid references public.profiles(id) on delete set null,
  issued_by       uuid references public.profiles(id) on delete set null,
  issued_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index dispatches_site_idx   on public.dispatches (site_id);
create index dispatches_status_idx on public.dispatches (status);
create trigger dispatches_touch before update on public.dispatches
  for each row execute function public.touch_updated_at();

create table public.dispatch_lines (
  id          uuid primary key default gen_random_uuid(),
  dispatch_id uuid not null references public.dispatches(id) on delete cascade,
  item_id     uuid not null references public.stock_items(id) on delete restrict,
  qty         numeric(18, 4) not null check (qty > 0),
  unit_cost   numeric(18, 4) not null default 0,
  created_at  timestamptz not null default now()
);
create index dispatch_lines_dispatch_idx on public.dispatch_lines (dispatch_id);
create index dispatch_lines_item_idx     on public.dispatch_lines (item_id);

-- -------------------------------------------------------------- transfers
-- Stock leaves the source site immediately and only lands at the
-- destination when someone confirms receipt: nothing vanishes in between,
-- it sits visibly as in-transit.
create table public.transfers (
  id              uuid primary key default gen_random_uuid(),
  transfer_number text not null unique default 'TR-' || lpad(nextval('public.transfer_number_seq')::text, 6, '0'),
  from_site_id    uuid not null references public.sites(id) on delete restrict,
  to_site_id      uuid not null references public.sites(id) on delete restrict,
  status          public.transfer_status not null default 'draft',
  notes           text,
  created_by      uuid references public.profiles(id) on delete set null,
  sent_by         uuid references public.profiles(id) on delete set null,
  sent_at         timestamptz,
  received_by     uuid references public.profiles(id) on delete set null,
  received_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint transfers_distinct_sites check (from_site_id <> to_site_id)
);
create index transfers_from_idx   on public.transfers (from_site_id);
create index transfers_to_idx     on public.transfers (to_site_id);
create index transfers_status_idx on public.transfers (status);
create trigger transfers_touch before update on public.transfers
  for each row execute function public.touch_updated_at();

create table public.transfer_lines (
  id           uuid primary key default gen_random_uuid(),
  transfer_id  uuid not null references public.transfers(id) on delete cascade,
  item_id      uuid not null references public.stock_items(id) on delete restrict,
  qty_sent     numeric(18, 4) not null check (qty_sent > 0),
  qty_received numeric(18, 4) not null default 0,
  unit_cost    numeric(18, 4) not null default 0,
  created_at   timestamptz not null default now()
);
create index transfer_lines_transfer_idx on public.transfer_lines (transfer_id);
create index transfer_lines_item_idx     on public.transfer_lines (item_id);

-- ------------------------------------------------------------ stock_takes
create table public.stock_takes (
  id           uuid primary key default gen_random_uuid(),
  reference    text not null unique default 'ST-' || lpad(nextval('public.stock_take_number_seq')::text, 6, '0'),
  site_id      uuid not null references public.sites(id) on delete restrict,
  scope        public.stock_take_scope not null default 'full',
  category_id  uuid references public.categories(id) on delete set null,
  bin_from     text,
  bin_to       text,
  status       public.stock_take_status not null default 'draft',
  notes        text,
  started_by   uuid references public.profiles(id) on delete set null,
  started_at   timestamptz not null default now(),
  submitted_at timestamptz,
  approved_by  uuid references public.profiles(id) on delete set null,
  approved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index stock_takes_site_idx   on public.stock_takes (site_id);
create index stock_takes_status_idx on public.stock_takes (status);
create trigger stock_takes_touch before update on public.stock_takes
  for each row execute function public.touch_updated_at();

create table public.stock_take_lines (
  id            uuid primary key default gen_random_uuid(),
  stock_take_id uuid not null references public.stock_takes(id) on delete cascade,
  item_id       uuid not null references public.stock_items(id) on delete restrict,
  bin_location  text,
  expected_qty  numeric(18, 4) not null default 0,
  counted_qty   numeric(18, 4),
  variance      numeric(18, 4) generated always as (coalesce(counted_qty, 0) - expected_qty) stored,
  unit_cost     numeric(18, 4) not null default 0,
  note          text,
  counted_by    uuid references public.profiles(id) on delete set null,
  counted_at    timestamptz,
  unique (stock_take_id, item_id)
);
create index stock_take_lines_take_idx on public.stock_take_lines (stock_take_id);
create index stock_take_lines_item_idx on public.stock_take_lines (item_id);

-- -------------------------------------------------------- stock_movements
-- Append-only audit log. Every quantity change in the system writes a row
-- here; nothing adjusts stock_levels without leaving one behind.
create table public.stock_movements (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null references public.stock_items(id) on delete restrict,
  site_id        uuid not null references public.sites(id) on delete restrict,
  movement_type  public.movement_type not null,
  direction      public.movement_direction not null,
  qty            numeric(18, 4) not null check (qty > 0),
  qty_after      numeric(18, 4),
  unit_cost      numeric(18, 4) not null default 0,
  reason         text,
  reference_type text,
  reference_id   uuid,
  reference_no   text,
  user_id        uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index stock_movements_item_idx    on public.stock_movements (item_id, created_at desc);
create index stock_movements_site_idx    on public.stock_movements (site_id, created_at desc);
create index stock_movements_created_idx on public.stock_movements (created_at desc);
create index stock_movements_ref_idx     on public.stock_movements (reference_type, reference_id);

-- ----------------------------------------------------------- cost_history
create table public.cost_history (
  id             uuid primary key default gen_random_uuid(),
  item_id        uuid not null references public.stock_items(id) on delete cascade,
  cost_type      public.cost_type not null default 'average',
  old_cost       numeric(18, 4),
  new_cost       numeric(18, 4) not null,
  qty_at_change  numeric(18, 4),
  reason         text,
  reference_type text,
  reference_id   uuid,
  changed_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index cost_history_item_idx on public.cost_history (item_id, created_at desc);
