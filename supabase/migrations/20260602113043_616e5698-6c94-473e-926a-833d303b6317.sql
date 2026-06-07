
-- Fix function search_path
create or replace function public.set_updated_at()
returns trigger language plpgsql security definer set search_path = public as $$
begin new.updated_at = now(); return new; end$$;

-- Restrict has_role execution
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
grant execute on function public.has_role(uuid, public.app_role) to authenticated, service_role;

-- Replace overly-permissive insert policies on orders/order_items with non-trivial checks
drop policy if exists "anyone can create order" on public.orders;
create policy "anyone can create order" on public.orders for insert to anon, authenticated
with check (
  length(customer_name) between 1 and 200
  and length(customer_phone) between 4 and 30
  and length(customer_address) between 3 and 1000
  and total >= 0
);

drop policy if exists "anyone can create order items" on public.order_items;
create policy "anyone can create order items" on public.order_items for insert to anon, authenticated
with check (
  quantity > 0 and cookie_count > 0 and unit_price >= 0
  and exists (select 1 from public.orders o where o.id = order_id)
);

drop policy if exists "public read fixed contents" on public.box_fixed_flavors;
create policy "public read fixed contents" on public.box_fixed_flavors for select to anon, authenticated
using (exists (select 1 from public.boxes b where b.id = box_id and b.is_active = true) or public.has_role(auth.uid(),'admin'));
