-- Atomic coupon usage decrement.
-- Called server-side after a successful order insert.
-- Uses FOR UPDATE to lock the row and prevent double-spending under concurrency.
CREATE OR REPLACE FUNCTION public.use_coupon(p_coupon_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_usage_limit integer;
BEGIN
  SELECT usage_limit
    INTO v_usage_limit
    FROM public.coupons
   WHERE id = p_coupon_id
     AND active = true
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- NULL means unlimited — nothing to decrement
  IF v_usage_limit IS NULL THEN
    RETURN true;
  END IF;

  -- Guard: already at 0 (deactivate and reject)
  IF v_usage_limit <= 0 THEN
    UPDATE public.coupons SET active = false WHERE id = p_coupon_id;
    RETURN false;
  END IF;

  -- Decrement; deactivate automatically when it hits 0
  UPDATE public.coupons
     SET usage_limit = usage_limit - 1,
         active      = CASE WHEN usage_limit - 1 <= 0 THEN false ELSE active END
   WHERE id = p_coupon_id;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.use_coupon(uuid) TO service_role;
