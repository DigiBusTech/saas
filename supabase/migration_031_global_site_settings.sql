-- Migration 031: Global Site Settings CMS
-- Creates a single-row configuration table for SEO, branding, and social sharing

CREATE TABLE IF NOT EXISTS global_site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_title TEXT NOT NULL DEFAULT 'SabiBio | AI Customer Operations',
  meta_description TEXT NOT NULL DEFAULT 'AI-assisted customer conversations, CRM, and automation for WhatsApp and Telegram.',
  seo_keywords TEXT[] DEFAULT ARRAY[]::TEXT[],
  og_image_url TEXT,
  universal_logo_url TEXT,
  universal_favicon_url TEXT,
  social_preview_links JSONB DEFAULT '{}'::JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Ensure only one row can exist
ALTER TABLE global_site_settings ADD CONSTRAINT only_one_row CHECK (id IS NOT NULL);

-- Create unique index on id to enforce single-row constraint
CREATE UNIQUE INDEX IF NOT EXISTS global_site_settings_single_row ON global_site_settings((TRUE));

-- Enable RLS (only service role can modify, all authenticated users can read)
ALTER TABLE global_site_settings ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Anyone can read global settings" ON global_site_settings;
DROP POLICY IF EXISTS "Only super_admin can update global settings" ON global_site_settings;

-- Read policy: Anyone can read
CREATE POLICY "Anyone can read global settings"
  ON global_site_settings FOR SELECT
  USING (TRUE);

-- Update policy: Only service role (bypassed via server functions) can update
-- Or allow super_admin role (determined via user profile in RLS context)
CREATE POLICY "Only super_admin can update global settings"
  ON global_site_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      INNER JOIN public.users pu ON pu.id = u.id
      WHERE u.id = auth.uid() AND pu.role = 'super_admin'
    )
  );

-- Insert policy: Only super_admin can insert
CREATE POLICY "Only super_admin can insert global settings"
  ON global_site_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users u
      INNER JOIN public.users pu ON pu.id = u.id
      WHERE u.id = auth.uid() AND pu.role = 'super_admin'
    )
  );

-- Delete policy: Only super_admin can delete
CREATE POLICY "Only super_admin can delete global settings"
  ON global_site_settings FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users u
      INNER JOIN public.users pu ON pu.id = u.id
      WHERE u.id = auth.uid() AND pu.role = 'super_admin'
    )
  );

-- Initialize with default row if not exists
INSERT INTO global_site_settings (site_title, meta_description)
VALUES (
  'SabiBio | AI Customer Operations',
  'AI-assisted customer conversations, CRM, and automation for WhatsApp and Telegram.'
)
ON CONFLICT DO NOTHING;
