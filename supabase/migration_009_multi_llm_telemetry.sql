-- MIGRATION 009: Multi-LLM Providers, System Telemetry & Diagnostic Tickets

-- 0. Ensure knowledge_bases has a vectorization status column (Phase 18 KB fix)
ALTER TABLE public.knowledge_bases
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING'; -- 'PENDING', 'INDEXED', 'FAILED'

-- 1. Multi-LLM Provider Configurations (Super Admin Controlled)
CREATE TABLE IF NOT EXISTS public.ai_provider_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(100) NOT NULL, -- e.g., 'Groq', 'Gemini', 'AgentRouter', 'Bluesminds', 'OpenAI'
    base_url TEXT DEFAULT 'https://api.openai.com/v1', -- Custom endpoints e.g. https://agentrouter.org/
    model_name VARCHAR(100) NOT NULL, -- e.g., 'llama-3.3-70b-versatile', 'gemini-1.5-flash'
    api_key_encrypted TEXT NOT NULL,
    priority INTEGER DEFAULT 1, -- Lower number = higher priority
    is_primary BOOLEAN DEFAULT false,
    is_fallback BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super Admin manage AI Providers" ON public.ai_provider_configs FOR ALL USING (
    public.get_my_role() = 'super_admin'
);

-- 2. System Telemetry & Error Logs (Observability Engine)
CREATE TABLE IF NOT EXISTS public.system_telemetry_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error', 'critical'
    source VARCHAR(50) NOT NULL, -- 'webhook_whatsapp', 'webhook_telegram', 'llm_router', 'inngest_job', 'vector_embeddings'
    endpoint TEXT,
    message TEXT NOT NULL,
    stack_trace TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    ai_diagnosis TEXT,
    is_resolved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_telemetry_created ON public.system_telemetry_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_workspace ON public.system_telemetry_logs(workspace_id);

ALTER TABLE public.system_telemetry_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super Admin View All Telemetry" ON public.system_telemetry_logs FOR ALL USING (
    public.get_my_role() = 'super_admin'
);
CREATE POLICY "Tenants View Own Telemetry" ON public.system_telemetry_logs FOR ALL USING (
    tenant_id = public.get_my_tenant_id()
);

-- 3. Gate Tenant Monitoring in Subscription Plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS has_tenant_monitoring BOOLEAN DEFAULT false;

-- 4. Technical Diagnostic Support Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
    diagnostic_payload JSONB DEFAULT '{}'::jsonb, -- Auto-attached logs, failing endpoints, environment state
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenants Manage Own Support Tickets" ON public.support_tickets FOR ALL USING (tenant_id = auth.uid());
CREATE POLICY "Super Admin Manage All Tickets" ON public.support_tickets FOR ALL USING (
    public.get_my_role() = 'super_admin'
);

-- Enable Realtime on Telemetry & Support Tickets
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_telemetry_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
