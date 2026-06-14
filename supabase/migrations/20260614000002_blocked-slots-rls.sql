-- blocked_delivery_slots: add slot_time text column (HH:MM) and RLS policies.
--
-- The existing `slot_hour` column is integer (full hours only), which does not
-- support 30-minute slots.  We add `slot_time text` to store "HH:MM" strings
-- like "13:00", "13:30", …, "20:30".
--
-- Logic: a row in this table means the slot is BLOCKED (hidden from customers).
-- No row = slot is available.

ALTER TABLE public.blocked_delivery_slots
  ADD COLUMN IF NOT EXISTS slot_time text;

-- slot_hour was NOT NULL but our inserts only supply slot_time; make it optional
ALTER TABLE public.blocked_delivery_slots
  ALTER COLUMN slot_hour DROP NOT NULL;

-- Unique constraint so the same (date, time) cannot be blocked twice
ALTER TABLE public.blocked_delivery_slots
  DROP CONSTRAINT IF EXISTS blocked_delivery_slots_date_time_key;

ALTER TABLE public.blocked_delivery_slots
  ADD CONSTRAINT blocked_delivery_slots_date_time_key
  UNIQUE (slot_date, slot_time);

-- Enable RLS (safe to run even if already enabled)
ALTER TABLE public.blocked_delivery_slots ENABLE ROW LEVEL SECURITY;

-- Customers (anon / authenticated) need SELECT so checkout can filter blocked slots
DROP POLICY IF EXISTS "Public read blocked slots" ON public.blocked_delivery_slots;
CREATE POLICY "Public read blocked slots"
  ON public.blocked_delivery_slots
  FOR SELECT TO anon, authenticated
  USING (true);

-- Admins: full access
DROP POLICY IF EXISTS "Admins manage blocked slots" ON public.blocked_delivery_slots;
CREATE POLICY "Admins manage blocked slots"
  ON public.blocked_delivery_slots
  FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.blocked_delivery_slots TO anon, authenticated;
GRANT ALL    ON public.blocked_delivery_slots TO service_role;
