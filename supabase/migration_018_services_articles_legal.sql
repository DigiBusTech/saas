-- MIGRATION 018: Workspace services, articles, legal pages, and retention-aware account controls

CREATE TABLE IF NOT EXISTS public.workspace_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12,2),
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  image_url TEXT,
  payment_link TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.workspace_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace services tenant access" ON public.workspace_services FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_services.workspace_id AND w.tenant_id = public.get_my_tenant_id())
);

CREATE TABLE IF NOT EXISTS public.workspace_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  show_on_sabibio BOOLEAN NOT NULL DEFAULT false,
  knowledge_id UUID REFERENCES public.knowledge_bases(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug)
);
ALTER TABLE public.workspace_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace articles tenant access" ON public.workspace_articles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_articles.workspace_id AND w.tenant_id = public.get_my_tenant_id())
);
CREATE POLICY "Published articles public read" ON public.workspace_articles FOR SELECT USING (is_published = true AND show_on_sabibio = true);

ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS sabibio_legal JSONB DEFAULT '{"privacy_policy":"","terms_of_service":"","disclaimer":"","cookie_policy":"","cookie_consent_required":false}'::jsonb;
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.workspace_crm
  ADD COLUMN IF NOT EXISTS email TEXT;

CREATE TABLE IF NOT EXISTS public.tenant_data_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  export JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tenant_data_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin data export access" ON public.tenant_data_exports FOR ALL USING (public.get_my_role() = 'super_admin');
