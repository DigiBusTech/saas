-- =============================================================================
-- Migration 030: 4-Tier Subscription System with Anti-Trial-Abuse
-- =============================================================================

-- =============================================================================
-- 1. EXTEND WORKSPACES TABLE: Add usage metering and trial tracking
-- =============================================================================
ALTER TABLE public.workspaces 
ADD COLUMN IF NOT EXISTS message_limit INTEGER DEFAULT 200,
ADD COLUMN IF NOT EXISTS messages_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS knowledge_doc_limit INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS knowledge_docs_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS crm_lead_limit INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS crm_leads_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_trial_claimed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(50) DEFAULT 'free_trial'
  CHECK (subscription_tier IN ('free_trial', 'pro', 'business', 'enterprise'));

-- Create index for trial expiration queries
CREATE INDEX IF NOT EXISTS idx_workspaces_trial_ends ON public.workspaces(trial_ends_at) WHERE trial_ends_at IS NOT NULL;

-- =============================================================================
-- 2. CREATE SIGNUP_FOOTPRINTS TABLE: Anti-abuse tracking
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.signup_footprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    ip_address TEXT,
    browser_fingerprint TEXT,
    email_domain TEXT,
    trial_claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fraud detection queries
CREATE INDEX IF NOT EXISTS idx_signup_footprints_ip ON public.signup_footprints(ip_address, created_at);
CREATE INDEX IF NOT EXISTS idx_signup_footprints_fingerprint ON public.signup_footprints(browser_fingerprint, created_at);
CREATE INDEX IF NOT EXISTS idx_signup_footprints_email_domain ON public.signup_footprints(email_domain, created_at);
CREATE INDEX IF NOT EXISTS idx_signup_footprints_trial ON public.signup_footprints(trial_claimed, created_at);

-- Enable RLS
ALTER TABLE public.signup_footprints ENABLE ROW LEVEL SECURITY;

-- Super Admins can view all footprints
CREATE POLICY "super_admin_signup_footprints" ON public.signup_footprints
    FOR ALL USING (public.get_my_role() = 'super_admin');

-- =============================================================================
-- 3. EXTEND SUBSCRIPTION_PLANS TABLE: Add new tier-specific columns
-- =============================================================================
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS ai_message_cap INTEGER DEFAULT 200,
ADD COLUMN IF NOT EXISTS knowledge_doc_cap INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS crm_lead_cap INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS has_whatsapp BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_telegram BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS has_custom_domain BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS multi_agent_seats INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_enterprise_contact_sales BOOLEAN DEFAULT FALSE;

-- =============================================================================
-- 4. UPDATE EXISTING PLANS: Migrate to new 4-tier structure
-- =============================================================================

-- Update existing plans to have new column values
UPDATE public.subscription_plans SET
  ai_message_cap = telegram_message_limit + whatsapp_message_limit,
  knowledge_doc_cap = CASE 
    WHEN slug = 'trial' THEN 10
    WHEN slug = 'basic' THEN 25
    WHEN slug = 'pro' THEN 100
    WHEN slug = 'unlimited' THEN 9999
    ELSE 10
  END,
  crm_lead_cap = CASE 
    WHEN slug = 'trial' THEN 50
    WHEN slug = 'basic' THEN 100
    WHEN slug = 'pro' THEN 500
    WHEN slug = 'unlimited' THEN 9999
    ELSE 50
  END,
  has_whatsapp = allow_whatsapp,
  has_telegram = allow_telegram,
  has_custom_domain = FALSE,
  multi_agent_seats = 1;

-- Clear existing plans to prepare for 4-tier structure (optional - only if you want a fresh start)
-- DELETE FROM public.subscription_plans WHERE slug NOT IN ('trial', 'pro', 'business', 'enterprise');

-- Insert/Update the 4 core tiers
INSERT INTO public.subscription_plans (
  name, slug, price_usd, price_ngn, stripe_price_id, 
  ai_message_cap, knowledge_doc_cap, crm_lead_cap,
  has_whatsapp, has_telegram, has_custom_domain, multi_agent_seats,
  features, is_active, is_enterprise_contact_sales, sort_order,
  allow_telegram, allow_whatsapp, telegram_message_limit, whatsapp_message_limit, monthly_token_limit
) VALUES 
(
  '14-Day Free Trial', 
  'free_trial', 
  0, 
  0, 
  NULL,
  200,         -- ai_message_cap
  10,          -- knowledge_doc_cap
  50,          -- crm_lead_cap
  TRUE,        -- has_whatsapp
  TRUE,        -- has_telegram
  FALSE,       -- has_custom_domain
  1,           -- multi_agent_seats
  '{"ai_insights": false, "priority_support": false, "dedicated_account_manager": false}'::JSONB,
  TRUE,        -- is_active
  FALSE,       -- is_enterprise_contact_sales
  0,           -- sort_order
  TRUE,        -- allow_telegram (legacy)
  TRUE,        -- allow_whatsapp (legacy)
  100,         -- telegram_message_limit (legacy)
  100,         -- whatsapp_message_limit (legacy)
  100000       -- monthly_token_limit (legacy)
),
(
  'Pro', 
  'pro', 
  4900,        -- $49/mo
  40000000,    -- ₦40,000/mo (kobo)
  'price_pro_monthly',
  1000,        -- ai_message_cap
  50,          -- knowledge_doc_cap
  200,         -- crm_lead_cap
  TRUE,        -- has_whatsapp
  TRUE,        -- has_telegram
  FALSE,       -- has_custom_domain
  2,           -- multi_agent_seats
  '{"ai_insights": true, "priority_support": false, "dedicated_account_manager": false}'::JSONB,
  TRUE,        -- is_active
  FALSE,       -- is_enterprise_contact_sales
  1,           -- sort_order
  TRUE,        -- allow_telegram (legacy)
  TRUE,        -- allow_whatsapp (legacy)
  500,         -- telegram_message_limit (legacy)
  500,         -- whatsapp_message_limit (legacy)
  500000       -- monthly_token_limit (legacy)
),
(
  'Business', 
  'business', 
  14900,       -- $149/mo
  120000000,   -- ₦120,000/mo (kobo)
  'price_business_monthly',
  5000,        -- ai_message_cap
  200,         -- knowledge_doc_cap
  1000,        -- crm_lead_cap
  TRUE,        -- has_whatsapp
  TRUE,        -- has_telegram
  FALSE,       -- has_custom_domain (NOT YET IMPLEMENTED)
  5,           -- multi_agent_seats (NOT YET IMPLEMENTED)
  '{"ai_insights": true, "priority_support": true, "dedicated_account_manager": false}'::JSONB,
  TRUE,        -- is_active
  FALSE,       -- is_enterprise_contact_sales
  2,           -- sort_order
  TRUE,        -- allow_telegram (legacy)
  TRUE,        -- allow_whatsapp (legacy)
  2500,        -- telegram_message_limit (legacy)
  2500,        -- whatsapp_message_limit (legacy)
  2000000      -- monthly_token_limit (legacy)
),
(
  'Enterprise', 
  'enterprise', 
  0,           -- Custom pricing - contact sales
  0,
  NULL,
  999999,      -- ai_message_cap (unlimited)
  999999,      -- knowledge_doc_cap (unlimited)
  999999,      -- crm_lead_cap (unlimited)
  TRUE,        -- has_whatsapp
  TRUE,        -- has_telegram
  FALSE,       -- has_custom_domain (NOT YET IMPLEMENTED)
  999999,      -- multi_agent_seats (unlimited, NOT YET IMPLEMENTED)
  '{"ai_insights": true, "priority_support": true, "dedicated_account_manager": true}'::JSONB,
  TRUE,        -- is_active
  TRUE,        -- is_enterprise_contact_sales
  3,           -- sort_order
  TRUE,        -- allow_telegram (legacy)
  TRUE,        -- allow_whatsapp (legacy)
  999999,      -- telegram_message_limit (legacy)
  999999,      -- whatsapp_message_limit (legacy)
  999999999    -- monthly_token_limit (legacy)
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price_usd = EXCLUDED.price_usd,
  price_ngn = EXCLUDED.price_ngn,
  ai_message_cap = EXCLUDED.ai_message_cap,
  knowledge_doc_cap = EXCLUDED.knowledge_doc_cap,
  crm_lead_cap = EXCLUDED.crm_lead_cap,
  has_whatsapp = EXCLUDED.has_whatsapp,
  has_telegram = EXCLUDED.has_telegram,
  has_custom_domain = EXCLUDED.has_custom_domain,
  multi_agent_seats = EXCLUDED.multi_agent_seats,
  is_enterprise_contact_sales = EXCLUDED.is_enterprise_contact_sales,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order;

-- =============================================================================
-- 5. CREATE HELPER FUNCTIONS: Usage increment and limit checks
-- =============================================================================

-- Function to check if workspace has exceeded AI message limit
CREATE OR REPLACE FUNCTION check_workspace_message_limit(workspace_id_input UUID)
RETURNS BOOLEAN AS $$
DECLARE
  ws RECORD;
BEGIN
  SELECT messages_used, message_limit, trial_ends_at, subscription_tier
  INTO ws
  FROM public.workspaces
  WHERE id = workspace_id_input;
  
  IF NOT FOUND THEN
    RETURN TRUE; -- Block if workspace doesn't exist
  END IF;
  
  -- Check if trial has expired
  IF ws.subscription_tier = 'free_trial' AND ws.trial_ends_at IS NOT NULL AND ws.trial_ends_at < NOW() THEN
    RETURN TRUE; -- Trial expired
  END IF;
  
  -- Check if message limit exceeded
  IF ws.messages_used >= ws.message_limit THEN
    RETURN TRUE; -- Limit reached
  END IF;
  
  RETURN FALSE; -- All good
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment workspace message usage
CREATE OR REPLACE FUNCTION increment_workspace_message_usage(workspace_id_input UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.workspaces 
  SET messages_used = messages_used + 1
  WHERE id = workspace_id_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if trial was already claimed from this IP/fingerprint
CREATE OR REPLACE FUNCTION check_trial_abuse(
  ip_addr TEXT,
  fingerprint TEXT,
  email_domain_input TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  abuse_count INTEGER;
BEGIN
  -- Check if a trial was claimed in the last 30 days from this IP or fingerprint
  SELECT COUNT(*) INTO abuse_count
  FROM public.signup_footprints
  WHERE trial_claimed = TRUE
    AND created_at > NOW() - INTERVAL '30 days'
    AND (
      ip_address = ip_addr 
      OR browser_fingerprint = fingerprint
      OR email_domain = email_domain_input
    );
  
  RETURN abuse_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 6. BACKFILL EXISTING WORKSPACES: Set trial dates for existing workspaces
-- =============================================================================

-- Set trial end dates for existing workspaces that don't have one
UPDATE public.workspaces 
SET 
  trial_ends_at = created_at + INTERVAL '14 days',
  is_trial_claimed = TRUE,
  subscription_tier = 'free_trial'
WHERE trial_ends_at IS NULL 
  AND subscription_tier IS NULL;

COMMENT ON TABLE public.signup_footprints IS 'Anti-trial-abuse tracking: Records device fingerprints, IPs, and email domains to prevent multiple free trial signups';
COMMENT ON COLUMN public.workspaces.trial_ends_at IS '14-day trial expiration timestamp. NULL means no trial or unlimited access';
COMMENT ON COLUMN public.workspaces.is_trial_claimed IS 'Tracks if this workspace has claimed a free trial to prevent abuse';
COMMENT ON COLUMN public.workspaces.subscription_tier IS 'Current subscription tier: free_trial, pro, business, or enterprise';
