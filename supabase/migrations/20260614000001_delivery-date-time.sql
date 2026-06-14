-- Delivery scheduling columns on the orders table.
--
-- delivery_date      DATE   — the calendar date chosen by the customer
-- delivery_time_slot TEXT   — the chosen time slot as a plain "HH:MM" string
--
-- NOTE: both columns already exist in production (added by an earlier migration).
-- This file is kept for reference; the ALTER statements use IF NOT EXISTS so
-- running this on a fresh DB is also safe.
--
-- DO NOT use the `delivery_time` column (timestamp without time zone) for
-- storing time-slot strings — it is a legacy timestamp field.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_date date,
  ADD COLUMN IF NOT EXISTS delivery_time_slot text;
