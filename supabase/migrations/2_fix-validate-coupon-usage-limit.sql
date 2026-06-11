-- Fix validate_coupon to respect usage_limit.
-- Without this, the frontend reports "valid" even after the coupon is exhausted.
CREATE OR REPLACE FUNCTION public.validate_coupon(
  _code     text,
  _subtotal numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon  record;
  v_discount numeric;
BEGIN
  SELECT * INTO v_coupon
    FROM public.coupons
   WHERE code    = upper(trim(_code))
     AND active  = true
     AND (expires_at IS NULL OR expires_at > now())
     AND (usage_limit IS NULL OR usage_limit > 0);  -- ← NEW: reject exhausted coupons

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false);
  END IF;

  IF _subtotal < coalesce(v_coupon.min_subtotal, 0) THEN
    RETURN jsonb_build_object(
      'valid',        false,
      'reason',       'min_subtotal',
      'min_subtotal', v_coupon.min_subtotal
    );
  END IF;

  IF v_coupon.type = 'percent' THEN
    v_discount := round(_subtotal * (v_coupon.value / 100.0) * 100) / 100;
  ELSE
    v_discount := least(_subtotal, v_coupon.value);
  END IF;

  RETURN jsonb_build_object(
    'valid',    true,
    'type',     v_coupon.type,
    'discount', v_discount
  );
END;
$$;
