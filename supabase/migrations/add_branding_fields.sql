-- Run this once in your Supabase dashboard → SQL Editor
-- Adds logo upload + editable hero text columns to site_settings.

ALTER TABLE site_settings
  ADD COLUMN IF NOT EXISTS logo_url            text,
  ADD COLUMN IF NOT EXISTS hero_eyebrow_en     text,
  ADD COLUMN IF NOT EXISTS hero_eyebrow_ar     text,
  ADD COLUMN IF NOT EXISTS hero_title_en       text,
  ADD COLUMN IF NOT EXISTS hero_title_ar       text,
  ADD COLUMN IF NOT EXISTS hero_subtitle_en    text,
  ADD COLUMN IF NOT EXISTS hero_subtitle_ar    text;
