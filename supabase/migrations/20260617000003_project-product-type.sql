-- Add product_type to projects table
-- 'external' = opens an external link
-- 'internal' = has its own detail page at /products/$slug

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'external'
    CHECK (product_type IN ('external', 'internal'));
