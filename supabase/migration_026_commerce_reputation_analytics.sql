-- MIGRATION 026: Conversational commerce, reputation, and analytics foundations
-- Phase 1 of 7 — schema only, no application code changes in this migration.
-- Non-destructive: extends existing workspace_products / workspace_services /
-- workspace_orders rather than creating competing tables.

-- 1. Extend workspace_products with a lookup code, external checkout link,
--    and an active flag (this table had no is_active column before now).
ALTER TABLE public.workspace_products
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS checkout_url TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_products_code
  ON public.workspace_products (workspace_id, code)
  WHERE code IS NOT NULL;

-- 2. Extend workspace_services with the same lookup code + checkout link.
ALTER TABLE public.workspace_services
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS checkout_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_services_code
  ON public.workspace_services (workspace_id, code)
  WHERE code IS NOT NULL;

-- 3. Extend workspace_orders so AI/chat-originated orders share the same
--    table as the existing storefront checkout flow. All columns are
--    nullable so existing rows and the current checkout UI keep working.
ALTER TABLE public.workspace_orders
  ADD COLUMN IF NOT EXISTS order_code TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT CHECK (channel IN ('whatsapp', 'telegram', 'web')),
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.workspace_crm(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by TEXT NOT NULL DEFAULT 'human' CHECK (updated_by IN ('ai', 'human'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_orders_code
  ON public.workspace_orders (workspace_id, order_code)
  WHERE order_code IS NOT NULL;

-- 4. Reputation / sentiment log — new table.
CREATE TABLE IF NOT EXISTS public.workspace_reputation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  chat_session_id TEXT NOT NULL,
  sentiment_score NUMERIC(3, 2) NOT NULL CHECK (sentiment_score BETWEEN -1 AND 1),
  sentiment_label TEXT NOT NULL CHECK (sentiment_label IN ('positive', 'neutral', 'negative', 'angry')),
  escalated BOOLEAN NOT NULL DEFAULT false,
  escalation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reputation_logs_workspace
  ON public.workspace_reputation_logs (workspace_id, created_at DESC);

ALTER TABLE public.workspace_reputation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace reputation logs tenant access" ON public.workspace_reputation_logs;
CREATE POLICY "Workspace reputation logs tenant access" ON public.workspace_reputation_logs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_reputation_logs.workspace_id AND w.tenant_id = public.get_my_tenant_id())
);

-- 5. Analytics events — new table.
CREATE TABLE IF NOT EXISTS public.workspace_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('chat_inquiry', 'rag_deflection', 'purchase_intent', 'order_status_check', 'escalation', 'conversion')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'telegram', 'web')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_workspace
  ON public.workspace_analytics_events (workspace_id, event_type, created_at DESC);

ALTER TABLE public.workspace_analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workspace analytics events tenant access" ON public.workspace_analytics_events;
CREATE POLICY "Workspace analytics events tenant access" ON public.workspace_analytics_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_analytics_events.workspace_id AND w.tenant_id = public.get_my_tenant_id())
);
