-- PRODUCTS
-- Non-box products with manually assigned flavors for display.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ar text,
  description_en text,
  description_ar text,
  image_url text,
  price numeric(10,2) not null default 0 check (price >= 0),
  is_active boolean not null default true,
  is_best_seller boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_updated
  before update on public.products
  for each row execute function public.set_updated_at();

grant select on public.products to anon, authenticated;
grant all on public.products to service_role;
grant insert, update, delete on public.products to authenticated;
alter table public.products enable row level security;

create policy "public read active products"
  on public.products for select to anon, authenticated
  using (is_active = true);

create policy "admins read all products"
  on public.products for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "admins write products"
  on public.products for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));


-- PRODUCT FLAVORS
-- Junction table: which specific flavors are visible/assigned to each product.
-- Admins manually pick the subset of flavors shown on each product's page.

create table public.product_flavors (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  flavor_id uuid not null references public.flavors(id) on delete cascade,
  sort_order int not null default 0,
  unique(product_id, flavor_id)
);

grant select on public.product_flavors to anon, authenticated;
grant all on public.product_flavors to service_role;
grant insert, update, delete on public.product_flavors to authenticated;
alter table public.product_flavors enable row level security;

create policy "public read product flavors"
  on public.product_flavors for select to anon, authenticated
  using (true);

create policy "admins write product flavors"
  on public.product_flavors for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create index on public.products (sort_order);
create index on public.product_flavors (product_id);
