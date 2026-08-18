-- =============================================================================
-- Migration 002: Dual Billing Support (Stripe + Flutterwave)
-- Run AFTER schema.sql and rls_policies.sql in the Supabase SQL Editor
-- =============================================================================

-- Add Flutterwave + currency columns to tenants
ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS flutterwave_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD',
    ADD COLUMN IF NOT EXISTS billing_provider TEXT NOT NULL DEFAULT 'stripe'
        CHECK (billing_provider IN ('stripe', 'flutterwave', 'none'));

-- Add monthly token allocation based on plan (populated by webhook after payment)
ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS monthly_token_limit BIGINT NOT NULL DEFAULT 100000,
    ADD COLUMN IF NOT EXISTS monthly_message_limit BIGINT NOT NULL DEFAULT 100,
    ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMPTZ NOT NULL DEFAULT now();

-- Plan definitions for reference:
-- trial:     100 messages / 100,000 tokens
-- basic:     500 messages / 500,000 tokens
-- pro:       2,000 messages / 2,000,000 tokens
-- unlimited: 999,999 messages / 999,999,999 tokens
