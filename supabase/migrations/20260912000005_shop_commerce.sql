-- RCL Shop: normalized catalog, inventory, customer carts, favorites, and orders.
create table if not exists public.shop_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.shop_collections (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  short_description text,
  category_id uuid references public.shop_categories(id) on delete set null,
  collection_id uuid references public.shop_collections(id) on delete set null,
  price integer not null check (price >= 0),
  compare_at_price integer check (compare_at_price is null or compare_at_price >= price),
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null default 'DRAFT' check (status in ('DRAFT','ACTIVE','SOLD_OUT','ARCHIVED','SCHEDULED')),
  featured boolean not null default false,
  limited_edition boolean not null default false,
  thumbnail_url text,
  images jsonb not null default '[]'::jsonb,
  team text,
  release_date timestamptz,
  edition_size integer check (edition_size is null or edition_size > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  name text not null,
  size text,
  color text,
  inventory integer not null default 0 check (inventory >= 0),
  reserved integer not null default 0 check (reserved >= 0 and reserved <= inventory),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, name)
);

create table if not exists public.product_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (cart_id, variant_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('RCL-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  user_id uuid references public.profiles(id) on delete set null,
  customer_email text not null,
  customer_name text,
  shipping_address jsonb,
  subtotal integer not null check (subtotal >= 0),
  shipping integer not null default 0 check (shipping >= 0),
  tax integer not null default 0 check (tax >= 0),
  total integer not null check (total >= 0),
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED')),
  fulfillment_status text not null default 'UNFULFILLED' check (fulfillment_status in ('UNFULFILLED','PROCESSING','SHIPPED','DELIVERED','CANCELLED')),
  tracking_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_snapshot jsonb not null,
  variant_snapshot jsonb,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.inventory_adjustments (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists products_status_idx on public.products(status);
create index if not exists products_category_idx on public.products(category_id);
create index if not exists products_collection_idx on public.products(collection_id);
create index if not exists products_search_idx on public.products using gin (to_tsvector('english', name || ' ' || coalesce(description, '') || ' ' || coalesce(team, '')));
create index if not exists product_variants_sku_idx on public.product_variants(sku);
create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);

insert into public.shop_categories (name, slug) values
  ('Apparel', 'apparel'), ('Headwear', 'headwear'), ('Accessories', 'accessories'),
  ('Team Gear', 'team-gear'), ('Limited Edition', 'limited-edition')
on conflict (slug) do nothing;

alter table public.shop_categories enable row level security;
alter table public.shop_collections enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_favorites enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_adjustments enable row level security;

create policy "public can read shop categories" on public.shop_categories for select using (true);
create policy "public can read published collections" on public.shop_collections for select using (is_published or public.is_staff_or_admin());
create policy "public can read active products" on public.products for select using (
  public.is_staff_or_admin() or (status = 'ACTIVE' or (status = 'SCHEDULED' and release_date <= now()))
);
create policy "public can read purchasable variants" on public.product_variants for select using (
  exists (select 1 from public.products p where p.id = product_id and (p.status in ('ACTIVE','SCHEDULED') and (p.status = 'ACTIVE' or p.release_date <= now())))
  or public.is_staff_or_admin()
);
create policy "staff manage shop catalog" on public.shop_categories for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage shop collections" on public.shop_collections for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage products" on public.products for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage variants" on public.product_variants for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "users manage own favorites" on public.product_favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users manage own carts" on public.carts for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users manage own cart items" on public.cart_items for all using (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
) with check (
  exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
);
create policy "users view own orders" on public.orders for select using (user_id = auth.uid() or public.is_staff_or_admin());
create policy "users view own order items" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff_or_admin()))
);
create policy "staff manage orders" on public.orders for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage order items" on public.order_items for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());
create policy "staff manage inventory adjustments" on public.inventory_adjustments for all using (public.is_staff_or_admin()) with check (public.is_staff_or_admin());

create or replace function public.adjust_shop_inventory(
  target_variant uuid, quantity_delta integer, adjustment_reason text
) returns public.product_variants language plpgsql security invoker set search_path = public as $$
declare updated_variant public.product_variants;
begin
  if not public.is_staff_or_admin() then raise exception 'Only shop administrators can adjust inventory'; end if;
  update public.product_variants
    set inventory = inventory + quantity_delta, updated_at = now()
    where id = target_variant and inventory + quantity_delta >= reserved
    returning * into updated_variant;
  if updated_variant.id is null then raise exception 'Inventory adjustment would make available stock negative'; end if;
  insert into public.inventory_adjustments (variant_id, quantity_delta, reason, created_by)
    values (target_variant, quantity_delta, adjustment_reason, auth.uid());
  return updated_variant;
end;
$$;
