-- =============================================================================
-- Migration 003: Phase 6 — Encrypted Control Plane & Email Engine
-- Run AFTER migration_002_dual_billing.sql in the Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- 1. SYSTEM_CONFIGS — encrypted key/value store for platform secrets
-- =============================================================================
CREATE TABLE public.system_configs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key  TEXT NOT NULL UNIQUE,
    config_value TEXT NOT NULL,          -- AES-256-GCM encrypted hex
    description TEXT,
    is_secret   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_system_configs_updated_at
    BEFORE UPDATE ON public.system_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: Super Admin only
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_system_configs" ON public.system_configs
    FOR ALL USING (public.get_my_role() = 'super_admin');

-- =============================================================================
-- 2. EMAIL_TEMPLATES — editable email templates with variable placeholders
-- =============================================================================
CREATE TABLE public.email_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_slug   TEXT NOT NULL UNIQUE,
    subject         TEXT NOT NULL,
    html_body       TEXT NOT NULL,
    variables       JSONB NOT NULL DEFAULT '[]'::JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS: Super Admin full access; no tenant access
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_all_email_templates" ON public.email_templates
    FOR ALL USING (public.get_my_role() = 'super_admin');

-- =============================================================================
-- 3. SEED: Default System Configs (placeholder — values set via Super Admin UI)
-- =============================================================================
INSERT INTO public.system_configs (config_key, config_value, description, is_secret) VALUES
    ('STRIPE_SECRET_KEY',        '', 'Stripe API secret key', TRUE),
    ('STRIPE_WEBHOOK_SECRET',    '', 'Stripe webhook signing secret', TRUE),
    ('FLUTTERWAVE_SECRET_KEY',   '', 'Flutterwave secret key', TRUE),
    ('FLUTTERWAVE_WEBHOOK_HASH', '', 'Flutterwave webhook hash', TRUE),
    ('GROQ_API_KEY',             '', 'Groq LLM API key', TRUE),
    ('SMTP_HOST',                '', 'SMTP server hostname', FALSE),
    ('SMTP_PORT',                '', 'SMTP server port', FALSE),
    ('SMTP_USER',                '', 'SMTP username / email', TRUE),
    ('SMTP_PASS',                '', 'SMTP password', TRUE),
    ('SMTP_FROM_NAME',           '', 'Sender display name', FALSE),
    ('SMTP_FROM_EMAIL',          '', 'Sender email address', FALSE)
ON CONFLICT (config_key) DO NOTHING;

-- =============================================================================
-- 4. SEED: Default Email Templates
-- =============================================================================
INSERT INTO public.email_templates (template_slug, subject, html_body, variables) VALUES
(
    'welcome_tenant',
    'Welcome to {{platform_name}}, {{tenant_name}}!',
    '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: #0B0E14; border-radius: 12px; padding: 32px; color: #e5e7eb;">
    <h1 style="color: #818cf8; margin-top: 0;">Welcome aboard! 🚀</h1>
    <p>Hi <strong>{{tenant_name}}</strong>,</p>
    <p>Your account on <strong>{{platform_name}}</strong> is now active. Here''s what you can do next:</p>
    <ul>
      <li>Set up your <strong>Telegram</strong> or <strong>WhatsApp</strong> integration</li>
      <li>Upload your knowledge base documents</li>
      <li>Start receiving AI-powered customer conversations</li>
    </ul>
    <a href="{{dashboard_url}}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">Go to Dashboard →</a>
    <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">If you have any questions, reply to this email.</p>
  </div>
</body>
</html>',
    '["tenant_name", "platform_name", "dashboard_url"]'::JSONB
),
(
    'limit_reached',
    '⚠️ {{tenant_name}}: You''ve reached your {{limit_type}} limit',
    '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: #0B0E14; border-radius: 12px; padding: 32px; color: #e5e7eb;">
    <h1 style="color: #f59e0b; margin-top: 0;">Usage Limit Reached ⚠️</h1>
    <p>Hi <strong>{{tenant_name}}</strong>,</p>
    <p>Your <strong>{{plan_name}}</strong> plan''s <strong>{{limit_type}}</strong> limit of <strong>{{limit_value}}</strong> has been reached for this billing cycle.</p>
    <p>New incoming messages will receive a fallback response until you upgrade or your billing cycle resets.</p>
    <a href="{{upgrade_url}}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">Upgrade Plan →</a>
    <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">Billing cycle resets on {{reset_date}}.</p>
  </div>
</body>
</html>',
    '["tenant_name", "plan_name", "limit_type", "limit_value", "upgrade_url", "reset_date"]'::JSONB
),
(
    'subscription_expiry',
    'Your {{platform_name}} subscription is expiring soon',
    '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: #0B0E14; border-radius: 12px; padding: 32px; color: #e5e7eb;">
    <h1 style="color: #ef4444; margin-top: 0;">Subscription Expiring Soon</h1>
    <p>Hi <strong>{{tenant_name}}</strong>,</p>
    <p>Your <strong>{{plan_name}}</strong> subscription on <strong>{{platform_name}}</strong> will expire on <strong>{{expiry_date}}</strong>.</p>
    <p>To avoid any interruption in your AI chatbot service, please renew your subscription.</p>
    <a href="{{billing_url}}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">Manage Billing →</a>
  </div>
</body>
</html>',
    '["tenant_name", "plan_name", "platform_name", "expiry_date", "billing_url"]'::JSONB
),
(
    'human_handoff_alert',
    '🔔 Human handoff requested — {{contact_name}} on {{platform}}',
    '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: #0B0E14; border-radius: 12px; padding: 32px; color: #e5e7eb;">
    <h1 style="color: #f59e0b; margin-top: 0;">Human Handoff Requested 🔔</h1>
    <p>A customer has requested to speak with a human agent:</p>
    <table style="width: 100%; margin: 16px 0; border-collapse: collapse;">
      <tr><td style="padding: 8px; color: #9ca3af;">Contact</td><td style="padding: 8px; color: #fff; font-weight: bold;">{{contact_name}}</td></tr>
      <tr><td style="padding: 8px; color: #9ca3af;">Platform</td><td style="padding: 8px; color: #fff; font-weight: bold;">{{platform}}</td></tr>
      <tr><td style="padding: 8px; color: #9ca3af;">Last Message</td><td style="padding: 8px; color: #fff;">{{last_message}}</td></tr>
    </table>
    <a href="{{conversation_url}}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">View Conversation →</a>
  </div>
</body>
</html>',
    '["contact_name", "platform", "last_message", "conversation_url"]'::JSONB
),
(
    'password_reset',
    'Reset your {{platform_name}} password',
    '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background: #0B0E14; border-radius: 12px; padding: 32px; color: #e5e7eb;">
    <h1 style="color: #818cf8; margin-top: 0;">Password Reset</h1>
    <p>Hi <strong>{{user_name}}</strong>,</p>
    <p>We received a request to reset your password. Click the button below to create a new password:</p>
    <a href="{{reset_url}}" style="display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">Reset Password →</a>
    <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">If you didn''t request this, you can safely ignore this email. This link expires in 1 hour.</p>
  </div>
</body>
</html>',
    '["user_name", "platform_name", "reset_url"]'::JSONB
)
ON CONFLICT (template_slug) DO NOTHING;
