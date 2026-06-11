
-- The earlier security migration revoked SELECT on coupons from ALL authenticated
-- users, which also broke the admin Coupons page (admins are authenticated too).
-- Restore SELECT for authenticated so that RLS policies (e.g. "admins manage
-- coupons") can take effect for admin users, while anonymous enumeration remains
-- blocked (anon still has no SELECT grant and must use validate_coupon() RPC).

grant select on public.coupons to authenticated;
