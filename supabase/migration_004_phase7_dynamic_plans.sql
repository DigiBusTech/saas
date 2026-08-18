-- =============================================================================
-- Migration 004: Phase 7 — Dynamic Plans & Multi-Channel Usage Limits
-- Run AFTER migration_003_phase6_control_plane.sql in the Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- 1. SUBSCRIPTION_PLANS — database-driven plan definitions
-- =============================================================================
CREATE TABLE public.subscription_plans (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  TEXT NOT NULL,
    slug                  TEXT NOT NULL UNIQUE,
    price_usd             INTEGER NOT NULL DEFAULT 0,        -- monthly in cents
    price_ngn             INTEGER NOT NULL DEFAULT 0,        -- monthly in kobo
    stripe_price_id       TEXT,
    features              JSONB NOT NULL DEFAULT '{}'::JSONB, -- e.g. {"ai_insights": true, "priority_support": false}
    allow_telegram        BOOLEAN NOT NULL DEFAULT TRUE,
    allow_whatsapp        BOOLEAN NOT NULL DEFAULT TRUE,
    telegram_message_limit INTEGER NOT NULL DEFAULT 100,
    whatsapp_message_limit INTEGER NOT NULL DEFAULT 100,
    monthly_token_limit   BIGINT NOT NULL DEFAULT 100000,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order            INTEGER NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_subscription_plans_updated_at
    BEFORE UPDATE ON public.subscription_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: Super Admin full CRUD; tenants can read active plans
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_plans" ON public.subscription_plans
    FOR ALL USING (public.get_my_role() = 'super_admin');

CREATE POLICY "anyone_read_active_plans" ON public.subscription_plans
    FOR SELECT USING (is_active = TRUE);

-- =============================================================================
-- 2. SEED: Default subscription plans (matching Phase 2 hardcoded values)
-- =============================================================================
INSERT INTO public.subscription_plans (name, slug, price_usd, price_ngn, stripe_price_id, features, allow_telegram, allow_whatsapp, telegram_message_limit, whatsapp_message_limit, monthly_token_limit, sort_order) VALUES
(
    'Free Trial', 'trial', 0, 0, '',
    '{"ai_insights": false, "priority_support": false, "dedicated_account_manager": false}'::JSONB,
    TRUE, TRUE, 50, 50, 100000, 0
),
(
    'Basic', 'basic', 2900, 2500000, 'price_basic_monthly',
    '{"ai_insights": false, "priority_support": false, "dedicated_account_manager": false}'::JSONB,
    TRUE, TRUE, 250, 250, 500000, 1
),
(
    'Pro', 'pro', 7900, 6500000, 'price_pro_monthly',
    '{"ai_insights": true, "priority_support": true, "dedicated_account_manager": false}'::JSONB,
    TRUE, TRUE, 1000, 1000, 2000000, 2
),
(
    'Unlimited', 'unlimited', 19900, 15000000, 'price_unlimited_monthly',
    '{"ai_insights": true, "priority_support": true, "dedicated_account_manager": true}'::JSONB,
    TRUE, TRUE, 999999, 999999, 999999999, 3
)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- 3. UPDATE TENANTS: Add per-channel usage tracking + plan_id FK
-- =============================================================================
ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.subscription_plans(id),
    ADD COLUMN IF NOT EXISTS telegram_message_usage BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS whatsapp_message_usage BIGINT NOT NULL DEFAULT 0;

-- Backfill: link existing tenants to plan rows by plan_type slug
UPDATE public.tenants t
SET plan_id = sp.id
FROM public.subscription_plans sp
WHERE t.plan_id IS NULL AND sp.slug = t.plan_type;
