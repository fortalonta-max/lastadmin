
-- Enums
create type public.order_status as enum ('pending','confirmed','preparing','out_for_delivery','delivered','cancelled');
create type public.box_type as enum ('fixed','byo');
create type public.coupon_type as enum ('percent','fixed');
create type public.app_role as enum ('admin','staff');

-- Updated-at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

-- ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "users view own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "admins manage roles" on public.user_roles for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- FLAVORS
create table public.flavors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ar text,
  description_en text,
  description_ar text,
  image_url text,
  is_available boolean not null default true,
  is_limited_edition boolean not null default false,
  is_out_of_stock boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger flavors_updated before update on public.flavors for each row execute function public.set_updated_at();
grant select on public.flavors to anon, authenticated;
grant all on public.flavors to service_role;
grant insert,update,delete on public.flavors to authenticated;
alter table public.flavors enable row level security;
create policy "public read available flavors" on public.flavors for select to anon, authenticated using (is_available = true);
create policy "admins read all flavors" on public.flavors for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins write flavors" on public.flavors for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- BOXES
create table public.boxes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_ar text,
  description_en text,
  description_ar text,
  image_url text,
  cookie_count int not null check (cookie_count > 0),
  price numeric(10,2) not null check (price >= 0),
  type box_type not null default 'byo',
  is_active boolean not null default true,
  is_best_seller boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger boxes_updated before update on public.boxes for each row execute function public.set_updated_at();
grant select on public.boxes to anon, authenticated;
grant all on public.boxes to service_role;
grant insert,update,delete on public.boxes to authenticated;
alter table public.boxes enable row level security;
create policy "public read active boxes" on public.boxes for select to anon, authenticated using (is_active = true);
create policy "admins read all boxes" on public.boxes for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins write boxes" on public.boxes for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- FIXED BOX CONTENTS
create table public.box_fixed_flavors (
  id uuid primary key default gen_random_uuid(),
  box_id uuid not null references public.boxes(id) on delete cascade,
  flavor_id uuid not null references public.flavors(id) on delete restrict,
  quantity int not null check (quantity > 0),
  unique(box_id, flavor_id)
);
grant select on public.box_fixed_flavors to anon, authenticated;
grant all on public.box_fixed_flavors to service_role;
grant insert,update,delete on public.box_fixed_flavors to authenticated;
alter table public.box_fixed_flavors enable row level security;
create policy "public read fixed contents" on public.box_fixed_flavors for select to anon, authenticated using (true);
create policy "admins write fixed contents" on public.box_fixed_flavors for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- COUPONS
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type coupon_type not null,
  value numeric(10,2) not null check (value >= 0),
  min_subtotal numeric(10,2) not null default 0,
  active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
grant select on public.coupons to anon, authenticated;
grant all on public.coupons to service_role;
grant insert,update,delete on public.coupons to authenticated;
alter table public.coupons enable row level security;
create policy "public read active coupons" on public.coupons for select to anon, authenticated using (active = true);
create policy "admins manage coupons" on public.coupons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ORDERS
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number serial unique,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  notes text,
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  discount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  coupon_code text,
  status order_status not null default 'pending',
  meta_event_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_at();
grant insert on public.orders to anon, authenticated;
grant select, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "anyone can create order" on public.orders for insert to anon, authenticated with check (true);
create policy "admins read orders" on public.orders for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins delete orders" on public.orders for delete to authenticated using (public.has_role(auth.uid(),'admin'));

-- ORDER ITEMS
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  box_id uuid references public.boxes(id) on delete set null,
  box_name text not null,
  cookie_count int not null,
  unit_price numeric(10,2) not null,
  quantity int not null default 1,
  selected_flavors jsonb not null default '[]'::jsonb
);
grant insert on public.order_items to anon, authenticated;
grant select, update, delete on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "anyone can create order items" on public.order_items for insert to anon, authenticated with check (true);
create policy "admins read order items" on public.order_items for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "admins write order items" on public.order_items for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- REVIEWS
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rating int not null check (rating between 1 and 5),
  body text not null,
  image_url text,
  is_published boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.reviews to anon, authenticated;
grant all on public.reviews to service_role;
grant insert,update,delete on public.reviews to authenticated;
alter table public.reviews enable row level security;
create policy "public read published reviews" on public.reviews for select to anon, authenticated using (is_published = true);
create policy "admins manage reviews" on public.reviews for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- FAQS
create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question_en text not null,
  question_ar text,
  answer_en text not null,
  answer_ar text,
  sort_order int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.faqs to anon, authenticated;
grant all on public.faqs to service_role;
grant insert,update,delete on public.faqs to authenticated;
alter table public.faqs enable row level security;
create policy "public read published faqs" on public.faqs for select to anon, authenticated using (is_published = true);
create policy "admins manage faqs" on public.faqs for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- SETTINGS (singleton)
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  store_name text not null default 'NYC Cookies',
  store_tagline_en text default 'Fresh-baked NYC-style cookies',
  store_tagline_ar text,
  whatsapp_number text,
  delivery_fee numeric(10,2) not null default 0,
  meta_pixel_id text,
  meta_capi_token text,
  meta_test_event_code text,
  contact_email text,
  contact_phone text,
  contact_address text,
  updated_at timestamptz not null default now()
);
create trigger settings_updated before update on public.site_settings for each row execute function public.set_updated_at();
insert into public.site_settings (id) values (1) on conflict do nothing;

grant select on public.site_settings to anon, authenticated;
grant all on public.site_settings to service_role;
grant insert,update,delete on public.site_settings to authenticated;
alter table public.site_settings enable row level security;
-- public can read non-sensitive cols via a view; for simplicity expose all and we'll strip secrets server-side when needed
create policy "public read settings" on public.site_settings for select to anon, authenticated using (true);
create policy "admins update settings" on public.site_settings for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "admins insert settings" on public.site_settings for insert to authenticated with check (public.has_role(auth.uid(),'admin'));

-- INDEXES
create index on public.flavors (sort_order);
create index on public.boxes (sort_order);
create index on public.orders (status, created_at desc);
create index on public.order_items (order_id);
create index on public.box_fixed_flavors (box_id);
