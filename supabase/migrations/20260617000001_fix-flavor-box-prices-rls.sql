-- ============================================================
-- Fix: flavor_box_prices was created via the Supabase dashboard
-- and therefore has RLS enabled but no policies and no grants.
-- Unauthenticated visitors (anon role) receive data: [] silently,
-- so discounts never appear on Firefox, mobile, or any fresh
-- browser session.
--
-- This migration:
--   1. Creates the table IF NOT EXISTS (safe for fresh databases).
--   2. Ensures the discount column exists (idempotent).
--   3. Grants SELECT to anon + authenticated.
--   4. Enables RLS (idempotent).
--   5. Adds a public read policy so every visitor can read prices.
--   6. Adds an admin-only write policy.
-- ============================================================

-- 1. Create table if it was never created via a prior migration
CREATE TABLE IF NOT EXISTS public.flavor_box_prices (
  id         uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id     uuid          NOT NULL REFERENCES public.boxes(id)   ON DELETE CASCADE,
  flavor_id  uuid          NOT NULL REFERENCES public.flavors(id) ON DELETE RESTRICT,
  price      numeric(10,2) NOT NULL DEFAULT 0   CHECK (price    >= 0),
  discount   numeric(10,2) NOT NULL DEFAULT 0   CHECK (discount >= 0),
  UNIQUE (box_id, flavor_id)
);

-- 2. Ensure discount column exists (no-op if already present)
ALTER TABLE public.flavor_box_prices
  ADD COLUMN IF NOT EXISTS discount numeric(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0);

-- 3. Grant table-level privileges
--    anon  = unauthenticated storefront visitors (must be able to read prices)
--    authenticated = logged-in users, including admins
GRANT SELECT ON public.flavor_box_prices TO anon, authenticated;
GRANT ALL    ON public.flavor_box_prices TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.flavor_box_prices TO authenticated;

-- 4. Enable RLS (safe to run even if already enabled)
ALTER TABLE public.flavor_box_prices ENABLE ROW LEVEL SECURITY;

-- 5. Public storefront read policy
--    Discount amounts are not sensitive; every visitor needs them to
--    see correct prices on the listing and detail pages.
DROP POLICY IF EXISTS "public read flavor box prices" ON public.flavor_box_prices;
CREATE POLICY "public read flavor box prices"
  ON public.flavor_box_prices
  FOR SELECT TO anon, authenticated
  USING (true);

-- 6. Admin-only write policy
DROP POLICY IF EXISTS "admins write flavor box prices" ON public.flavor_box_prices;
CREATE POLICY "admins write flavor box prices"
  ON public.flavor_box_prices
  FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Index for fast per-box lookups (used by both listing and detail pages)
CREATE INDEX IF NOT EXISTS flavor_box_prices_box_id_idx ON public.flavor_box_prices (box_id);
