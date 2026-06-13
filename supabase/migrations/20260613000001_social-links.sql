-- Social links table for admin-managed social media platforms

CREATE TABLE IF NOT EXISTS social_links (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  url text NOT NULL,
  is_active boolean DEFAULT true NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;

-- Public: only active links are readable
CREATE POLICY "Public can view active social links"
  ON social_links
  FOR SELECT
  USING (is_active = true);

-- Admins: full access based on user_roles table
CREATE POLICY "Admin can manage social links"
  ON social_links
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role = 'admin'
    )
  );
