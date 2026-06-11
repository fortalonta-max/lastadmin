
-- ============================================================
-- Security fix 1: Coupon enumeration via public read policy
-- ============================================================

-- Remove the policy that lets anyone enumerate all active coupon codes.
drop policy if exists "public read active coupons" on public.coupons;

-- Revoke direct table read access for public roles so the coupons table
-- is no longer reachable through the Supabase client or REST API.
revoke select on public.coupons from anon, authenticated;

-- Provide a narrowly-scoped SECURITY DEFINER function that accepts a code
-- and the current subtotal, and returns only whether the coupon is valid
-- and the resulting discount amount.  The full coupon row is never exposed.
create or replace function public.validate_coupon(
  _code    text,
  _subtotal numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon record;
  v_discount numeric;
begin
  select * into v_coupon
  from public.coupons
  where code = upper(trim(_code))
    and active = true
    and (expires_at is null or expires_at > now());

  if not found then
    return jsonb_build_object('valid', false);
  end if;

  if _subtotal < coalesce(v_coupon.min_subtotal, 0) then
    return jsonb_build_object(
      'valid',        false,
      'reason',       'min_subtotal',
      'min_subtotal', v_coupon.min_subtotal
    );
  end if;

  if v_coupon.type = 'percent' then
    v_discount := round(_subtotal * (v_coupon.value / 100.0) * 100) / 100;
  else
    v_discount := least(_subtotal, v_coupon.value);
  end if;

  return jsonb_build_object(
    'valid',    true,
    'type',     v_coupon.type,
    'discount', v_discount
  );
end;
$$;

-- Grant execution to public roles so the checkout page can call it via RPC.
grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;


-- ============================================================
-- Security fix 2: Fraudulent order item insertion
-- ============================================================

-- Remove the policy that allowed direct inserts with arbitrary prices and
-- arbitrary order_id references.
drop policy if exists "anyone can create order items" on public.order_items;

-- Revoke the INSERT privilege that made the policy reachable at all.
-- All order item rows are now created exclusively through the server-side
-- placeOrder function which runs as service_role and enforces prices from
-- the boxes table.
revoke insert on public.order_items from anon, authenticated;
