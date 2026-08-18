-- MIGRATION 007: Phase 16 — Workspace Categories & CRM phone_number column

-- 1. Create Workspace Categories Table
CREATE TABLE IF NOT EXISTS public.workspace_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(20) DEFAULT '#6366f1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, name)
);

ALTER TABLE public.workspace_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace Categories RLS" ON public.workspace_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_categories.workspace_id AND tenant_id = public.get_my_tenant_id())
);

-- 2. Add phone_number column to workspace_crm for WhatsApp imports
ALTER TABLE public.workspace_crm ADD COLUMN IF NOT EXISTS phone_number VARCHAR(50);

-- 3. Add category column to workspace_crm for tag/category assignment
ALTER TABLE public.workspace_crm ADD COLUMN IF NOT EXISTS category VARCHAR(100);

-- 4. Create unique index for phone_number + workspace_id upserts
CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_crm_phone_ws 
ON public.workspace_crm(workspace_id, phone_number) 
WHERE phone_number IS NOT NULL;
