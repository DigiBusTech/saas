-- =============================================================================
-- Row Level Security (RLS) Policies — Multi-Tenant Isolation
-- Run AFTER schema.sql in the Supabase SQL Editor
-- =============================================================================

-- Helper: resolve the current user's role and tenant_id from public.users
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
    SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$;

-- =============================================================================
-- TENANTS
-- =============================================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Super admins can see all tenants
CREATE POLICY "super_admin_all_tenants" ON public.tenants
    FOR ALL USING (public.get_my_role() = 'super_admin');

-- Tenant users can only see their own tenant row
CREATE POLICY "tenant_read_own" ON public.tenants
    FOR SELECT USING (id = public.get_my_tenant_id());

-- =============================================================================
-- USERS
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Super admins can see all users
CREATE POLICY "super_admin_all_users" ON public.users
    FOR ALL USING (public.get_my_role() = 'super_admin');

-- Tenant admins can see users in their tenant
CREATE POLICY "tenant_admin_read_users" ON public.users
    FOR SELECT USING (tenant_id = public.get_my_tenant_id());

-- Users can read their own row
CREATE POLICY "user_read_own" ON public.users
    FOR SELECT USING (id = auth.uid());

-- Users can update their own row (name, etc.)
CREATE POLICY "user_update_own" ON public.users
    FOR UPDATE USING (id = auth.uid());

-- =============================================================================
-- INTEGRATIONS
-- =============================================================================
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

-- Super admins can do everything
CREATE POLICY "super_admin_all_integrations" ON public.integrations
    FOR ALL USING (public.get_my_role() = 'super_admin');

-- Tenant admins can CRUD their own integrations
CREATE POLICY "tenant_admin_manage_integrations" ON public.integrations
    FOR ALL USING (
        tenant_id = public.get_my_tenant_id()
        AND public.get_my_role() IN ('tenant_admin', 'agent')
    );

-- =============================================================================
-- KNOWLEDGE_BASES
-- =============================================================================
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_kb" ON public.knowledge_bases
    FOR ALL USING (public.get_my_role() = 'super_admin');

CREATE POLICY "tenant_manage_own_kb" ON public.knowledge_bases
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

-- =============================================================================
-- CONVERSATIONS
-- =============================================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_conversations" ON public.conversations
    FOR ALL USING (public.get_my_role() = 'super_admin');

CREATE POLICY "tenant_manage_own_conversations" ON public.conversations
    FOR ALL USING (tenant_id = public.get_my_tenant_id());

-- =============================================================================
-- MESSAGES
-- =============================================================================
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_messages" ON public.messages
    FOR ALL USING (public.get_my_role() = 'super_admin');

-- Messages scoped through conversation → tenant_id
CREATE POLICY "tenant_read_own_messages" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
            AND c.tenant_id = public.get_my_tenant_id()
        )
    );

CREATE POLICY "tenant_insert_own_messages" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.conversations c
            WHERE c.id = messages.conversation_id
            AND c.tenant_id = public.get_my_tenant_id()
        )
    );
