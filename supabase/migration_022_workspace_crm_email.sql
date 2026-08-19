-- MIGRATION 022: Ensure CRM email support exists in production

ALTER TABLE public.workspace_crm
  ADD COLUMN IF NOT EXISTS email TEXT;