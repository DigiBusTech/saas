-- MIGRATION 013: Custom persona prompt per workspace

ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS custom_prompt TEXT;
