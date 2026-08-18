-- MIGRATION 006: Non-Destructive Workspaces & Multi-Business Expansion

-- 0. Add is_suspended flag to tenants for admin suspension control
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- 1. Add max_workspaces limit to existing subscription_plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS max_workspaces INTEGER DEFAULT 1;

-- Update existing plans with reasonable workspace caps
UPDATE public.subscription_plans SET max_workspaces = 1 WHERE price_usd = 0 OR name ILIKE '%starter%';
UPDATE public.subscription_plans SET max_workspaces = 3 WHERE name ILIKE '%pro%';
UPDATE public.subscription_plans SET max_workspaces = 10 WHERE name ILIKE '%business%' OR name ILIKE '%enterprise%';

-- 2. Create Workspaces Table (1 Tenant -> Many Workspaces)
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    logo_url TEXT,
    bot_persona VARCHAR(100) DEFAULT 'Professional English',
    agent_mode VARCHAR(50) DEFAULT 'autopilot', -- 'autopilot', 'copilot', 'manual'
    
    -- Unique Encrypted API Credentials Per Business
    telegram_bot_token TEXT,
    whatsapp_phone_number_id TEXT,
    whatsapp_access_token TEXT,
    whatsapp_verify_token TEXT,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    UNIQUE(tenant_id, slug)
);

-- Enable RLS on Workspaces
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants can manage their own workspaces"
ON public.workspaces FOR ALL
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY "Super Admins bypass workspace RLS"
ON public.workspaces FOR ALL
USING (public.get_my_role() = 'super_admin');

-- 3. Upgrade Operational Tables to reference workspace_id
ALTER TABLE public.knowledge_bases ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- 4. Create Workspace-Specific Products Table
CREATE TABLE IF NOT EXISTS public.workspace_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    image_url TEXT,
    payment_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.workspace_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace Products RLS" ON public.workspace_products FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_products.workspace_id AND tenant_id = public.get_my_tenant_id())
);

-- 5. Create Workspace-Specific CRM Table
CREATE TABLE IF NOT EXISTS public.workspace_crm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'telegram' or 'whatsapp'
    platform_user_id VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    lead_score INTEGER DEFAULT 10,
    tags TEXT[] DEFAULT ARRAY['New Lead'], -- e.g., {'High Ticket', 'Hot Lead', 'Subscribed'}
    subscription_status VARCHAR(50) DEFAULT 'non_subscriber', -- 'lead', 'subscriber', 'expired'
    subscription_expiry TIMESTAMP WITH TIME ZONE,
    last_interaction TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, platform, platform_user_id)
);
ALTER TABLE public.workspace_crm ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace CRM RLS" ON public.workspace_crm FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_crm.workspace_id AND tenant_id = public.get_my_tenant_id())
);

-- 6. Create Workspace Automations Table
CREATE TABLE IF NOT EXISTS public.workspace_automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    trigger_type VARCHAR(100) NOT NULL, -- 'new_lead', 'subscription_expiring', 'broadcast'
    trigger_days_before INTEGER DEFAULT 0,
    message_template TEXT NOT NULL,
    media_url TEXT,
    cta_button_text VARCHAR(100),
    cta_link TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.workspace_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace Automations RLS" ON public.workspace_automations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_automations.workspace_id AND tenant_id = public.get_my_tenant_id())
);
