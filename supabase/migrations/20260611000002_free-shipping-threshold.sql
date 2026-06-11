-- Add free_shipping_threshold to site_settings.
-- Defaults to 750 to match the previously hardcoded value.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS free_shipping_threshold numeric(10,2) NOT NULL DEFAULT 750;
