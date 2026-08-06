-- NEXUS Stock :: 01 core schema
-- Sites, people, categories, suppliers, items and per-site stock levels.

create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- enums
create type public.user_role         as enum ('admin', 'site_supervisor', 'staff');
create type public.movement_type     as enum ('receipt', 'dispatch', 'transfer_out', 'transfer_in', 'adjustment', 'stock_take');
create type public.movement_direction as enum ('in', 'out');
create type public.po_status         as enum ('draft', 'sent', 'partially_received', 'received', 'closed', 'cancelled');
create type public.dispatch_status   as enum ('draft', 'issued', 'cancelled');
create type public.transfer_status   as enum ('draft', 'in_transit', 'received', 'cancelled');
create type public.stock_take_status as enum ('draft', 'counting', 'pending_approval', 'approved', 'cancelled');
create type public.stock_take_scope  as enum ('full', 'category', 'bin_range');
create type public.cost_type         as enum ('standard', 'average');

-- ------------------------------------------------------------ updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------- sites
create table public.sites (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  address     text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create trigger sites_touch before update on public.sites
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------- profiles
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  full_name     text,
  role          public.user_role not null default 'staff',
  home_site_id  uuid references public.sites(id) on delete set null,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Extra sites a staff member may work across (beyond their home site).
create table public.user_sites (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  site_id  uuid not null references public.sites(id) on delete cascade,
  primary key (user_id, site_id)
);

-- Provision a profile row whenever an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------ categories
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  parent_id   uuid references public.categories(id) on delete set null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index categories_parent_idx on public.categories (parent_id);
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------- suppliers
create table public.suppliers (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  name            text not null,
  contact_name    text,
  email           text,
  phone           text,
  address         text,
  lead_time_days  integer not null default 7,
  notes           text,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index suppliers_name_trgm on public.suppliers using gin (name gin_trgm_ops);
create trigger suppliers_touch before update on public.suppliers
  for each row execute function public.touch_updated_at();

-- ----------------------------------------------------------- stock_items
create table public.stock_items (
  id                  uuid primary key default gen_random_uuid(),
  sku                 text not null unique,
  description         text not null,
  long_description    text,
  category_id         uuid references public.categories(id) on delete set null,
  uom                 text not null default 'EA',
  barcode             text unique,
  default_bin         text,
  reorder_point       numeric(18, 4) not null default 0,
  reorder_qty         numeric(18, 4) not null default 0,
  standard_cost       numeric(18, 4) not null default 0,
  avg_cost            numeric(18, 4) not null default 0,
  default_supplier_id uuid references public.suppliers(id) on delete set null,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index stock_items_sku_trgm  on public.stock_items using gin (sku gin_trgm_ops);
create index stock_items_desc_trgm on public.stock_items using gin (description gin_trgm_ops);
create index stock_items_barcode_idx on public.stock_items (barcode);
create index stock_items_category_idx on public.stock_items (category_id);
create trigger stock_items_touch before update on public.stock_items
  for each row execute function public.touch_updated_at();

-- Supplier-specific part numbers / pricing for an item.
create table public.supplier_items (
  id               uuid primary key default gen_random_uuid(),
  supplier_id      uuid not null references public.suppliers(id) on delete cascade,
  item_id          uuid not null references public.stock_items(id) on delete cascade,
  supplier_part_no text,
  last_price       numeric(18, 4),
  last_price_at    timestamptz,
  lead_time_days   integer,
  is_preferred     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (supplier_id, item_id)
);
create index supplier_items_item_idx on public.supplier_items (item_id);
create trigger supplier_items_touch before update on public.supplier_items
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------- stock_levels
-- The fix for the #1 SYSPRO pain point: quantity is always per item PER SITE.
create table public.stock_levels (
  id            uuid primary key default gen_random_uuid(),
  item_id       uuid not null references public.stock_items(id) on delete cascade,
  site_id       uuid not null references public.sites(id) on delete cascade,
  qty_on_hand   numeric(18, 4) not null default 0,
  qty_in_transit numeric(18, 4) not null default 0,
  qty_on_order  numeric(18, 4) not null default 0,
  bin_location  text,
  last_movement_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (item_id, site_id)
);
create index stock_levels_site_idx on public.stock_levels (site_id);
create index stock_levels_item_idx on public.stock_levels (item_id);
create trigger stock_levels_touch before update on public.stock_levels
  for each row execute function public.touch_updated_at();
