-- MIGRATION 011: Repair deployed control-plane policies and apply reliability schema

-- Migration 009 used tenants.role, but role is stored in users.
DROP POLICY IF EXISTS "Super Admin manage AI Providers" ON public.ai_provider_configs;
CREATE POLICY "Super Admin manage AI Providers" ON public.ai_provider_configs FOR ALL USING (
  public.get_my_role() = 'super_admin'
) WITH CHECK (
  public.get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "Super Admin View All Telemetry" ON public.system_telemetry_logs;
CREATE POLICY "Super Admin View All Telemetry" ON public.system_telemetry_logs FOR ALL USING (
  public.get_my_role() = 'super_admin'
) WITH CHECK (
  public.get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "Tenants View Own Telemetry" ON public.system_telemetry_logs;
CREATE POLICY "Tenants View Own Telemetry" ON public.system_telemetry_logs FOR ALL USING (
  tenant_id = public.get_my_tenant_id() OR public.get_my_role() = 'super_admin'
) WITH CHECK (
  tenant_id = public.get_my_tenant_id() OR public.get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "Tenants Manage Own Support Tickets" ON public.support_tickets;
CREATE POLICY "Tenants Manage Own Support Tickets" ON public.support_tickets FOR ALL USING (
  tenant_id = public.get_my_tenant_id() OR public.get_my_role() = 'super_admin'
) WITH CHECK (
  tenant_id = public.get_my_tenant_id() OR public.get_my_role() = 'super_admin'
);

DROP POLICY IF EXISTS "Super Admin Manage All Tickets" ON public.support_tickets;
CREATE POLICY "Super Admin Manage All Tickets" ON public.support_tickets FOR ALL USING (
  public.get_my_role() = 'super_admin'
) WITH CHECK (
  public.get_my_role() = 'super_admin'
);

CREATE TABLE IF NOT EXISTS public.tenant_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  report JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id)
);

ALTER TABLE public.tenant_insights ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant insights access" ON public.tenant_insights;
CREATE POLICY "Tenant insights access" ON public.tenant_insights FOR ALL USING (
  tenant_id = public.get_my_tenant_id() OR public.get_my_role() = 'super_admin'
) WITH CHECK (
  tenant_id = public.get_my_tenant_id() OR public.get_my_role() = 'super_admin'
);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS external_message_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_external_id
  ON public.messages(conversation_id, external_message_id)
  WHERE external_message_id IS NOT NULL;

ALTER TABLE public.workspaces ADD COLUMN IF NOT EXISTS telegram_webhook_secret TEXT;