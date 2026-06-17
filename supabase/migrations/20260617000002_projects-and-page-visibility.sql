-- ============================================================
-- 1. PROJECTS table
--    Generic project/portfolio entries — not tied to boxes.
--    Admins upload a project (image, name, description, price,
--    optional external link) and it can be toggled active/hidden.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.projects (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text          NOT NULL UNIQUE,
  name_en        text          NOT NULL,
  name_ar        text,
  description_en text,
  description_ar text,
  image_url      text,
  price          numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  link_url       text,
  is_active      boolean       NOT NULL DEFAULT true,
  is_best_seller boolean       NOT NULL DEFAULT false,
  sort_order     int           NOT NULL DEFAULT 0,
  created_at     timestamptz   NOT NULL DEFAULT now(),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

CREATE OR REPLACE TRIGGER projects_updated
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON public.projects TO anon, authenticated;
GRANT ALL    ON public.projects TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.projects TO authenticated;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read active projects"  ON public.projects;
CREATE POLICY "public read active projects"
  ON public.projects FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "admins read all projects" ON public.projects;
CREATE POLICY "admins read all projects"
  ON public.projects FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins write projects" ON public.projects;
CREATE POLICY "admins write projects"
  ON public.projects FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS projects_sort_order_idx ON public.projects (sort_order);


-- ============================================================
-- 2. PAGE VISIBILITY columns in site_settings
--    Each flag controls whether that page/nav-link is shown
--    to storefront visitors. Default = true (visible).
-- ============================================================

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS page_boxes_enabled    boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS page_buildbox_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS page_flavors_enabled  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS page_products_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS page_contact_enabled  boolean NOT NULL DEFAULT true;
