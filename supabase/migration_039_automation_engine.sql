-- =====================================================
-- PHASE 5.5: Automation Engine Enhancement
-- Multi-channel (WhatsApp, Telegram, Email), Rate-limiting, Multi-step Drips
-- =====================================================

-- 1. Expand workspace_automations with multi-channel support
ALTER TABLE public.workspace_automations
ADD COLUMN IF NOT EXISTS channel_filter TEXT[] DEFAULT ARRAY['whatsapp', 'telegram'],
ADD COLUMN IF NOT EXISTS email_subject TEXT,
ADD COLUMN IF NOT EXISTS execution_mode TEXT DEFAULT 'immediate' CHECK (execution_mode IN ('immediate', 'scheduled', 'drip')),
ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS rate_limit_delay_ms INTEGER DEFAULT 35,
ADD COLUMN IF NOT EXISTS last_executed_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.workspace_automations.channel_filter IS 'Array of delivery channels: whatsapp, telegram, web, email';
COMMENT ON COLUMN public.workspace_automations.email_subject IS 'Email subject line with variable support: {customer_name}, {business_name}';
COMMENT ON COLUMN public.workspace_automations.execution_mode IS 'immediate = instant broadcast, scheduled = future date, drip = multi-step sequence';
COMMENT ON COLUMN public.workspace_automations.batch_size IS 'Number of messages per batch for rate limiting';
COMMENT ON COLUMN public.workspace_automations.rate_limit_delay_ms IS 'Delay between individual messages (35ms for Telegram, 1000-2000ms for WhatsApp)';

-- 2. Create workspace_automation_steps for multi-step drips
CREATE TABLE IF NOT EXISTS public.workspace_automation_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES public.workspace_automations(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL DEFAULT 1,
    delay_minutes INTEGER DEFAULT 0,
    message_template TEXT NOT NULL,
    email_subject TEXT,
    media_url TEXT,
    cta_button_text VARCHAR(100),
    cta_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(automation_id, step_number)
);

ALTER TABLE public.workspace_automation_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Automation Steps RLS" ON public.workspace_automation_steps FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.workspace_automations wa
        JOIN public.workspaces w ON wa.workspace_id = w.id
        WHERE wa.id = workspace_automation_steps.automation_id
        AND w.tenant_id = public.get_my_tenant_id()
    )
);

COMMENT ON TABLE public.workspace_automation_steps IS 'Multi-step sequences for drip campaigns';
COMMENT ON COLUMN public.workspace_automation_steps.delay_minutes IS 'Delay before sending this step (0 = immediate)';

-- 3. Create workspace_automation_logs for execution tracking
CREATE TABLE IF NOT EXISTS public.workspace_automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES public.workspace_automations(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.workspace_crm(id) ON DELETE SET NULL,
    step_number INTEGER DEFAULT 1,
    channel TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'rate_limited', 'skipped')),
    recipient_identifier TEXT NOT NULL,
    message_content TEXT,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_automation_logs_automation_id ON public.workspace_automation_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_workspace_id ON public.workspace_automation_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_lead_id ON public.workspace_automation_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_status ON public.workspace_automation_logs(status);
CREATE INDEX IF NOT EXISTS idx_automation_logs_created_at ON public.workspace_automation_logs(created_at DESC);

ALTER TABLE public.workspace_automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Automation Logs RLS" ON public.workspace_automation_logs FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workspaces WHERE id = workspace_automation_logs.workspace_id AND tenant_id = public.get_my_tenant_id())
);

COMMENT ON TABLE public.workspace_automation_logs IS 'Execution tracking for all automation deliveries with partial completion support';
COMMENT ON COLUMN public.workspace_automation_logs.recipient_identifier IS 'Phone number, email, or chat_id depending on channel';
COMMENT ON COLUMN public.workspace_automation_logs.status IS 'pending = queued, sent = delivered, failed = error, rate_limited = 429 response, skipped = no valid recipient';

-- 4. Add email column to workspace_crm for email channel support
ALTER TABLE public.workspace_crm
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_workspace_crm_email ON public.workspace_crm(email) WHERE email IS NOT NULL;

COMMENT ON COLUMN public.workspace_crm.email IS 'Lead email address for email channel delivery';
COMMENT ON COLUMN public.workspace_crm.email_verified IS 'Whether email has been verified (e.g., opened a link, replied)';

-- 5. Update workspace_crm to track channel preferences
ALTER TABLE public.workspace_crm
ADD COLUMN IF NOT EXISTS preferred_channel TEXT DEFAULT 'whatsapp' CHECK (preferred_channel IN ('whatsapp', 'telegram', 'web_chat', 'email'));

COMMENT ON COLUMN public.workspace_crm.preferred_channel IS 'Lead\'s preferred communication channel';

-- 6. Create function to get leads eligible for automation by channel
CREATE OR REPLACE FUNCTION public.get_automation_eligible_leads(
    p_workspace_id UUID,
    p_channels TEXT[]
) RETURNS TABLE (
    lead_id UUID,
    lead_name TEXT,
    phone TEXT,
    email TEXT,
    telegram_chat_id TEXT,
    preferred_channel TEXT,
    channel_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        wc.id AS lead_id,
        wc.contact_name AS lead_name,
        wc.phone,
        wc.email,
        wc.telegram_chat_id,
        wc.preferred_channel,
        wc.channel_type
    FROM public.workspace_crm wc
    WHERE wc.workspace_id = p_workspace_id
    AND wc.lead_status = 'active_chat'
    AND (
        ('whatsapp' = ANY(p_channels) AND wc.channel_type = 'whatsapp' AND wc.phone IS NOT NULL)
        OR ('telegram' = ANY(p_channels) AND wc.channel_type = 'telegram' AND wc.telegram_chat_id IS NOT NULL)
        OR ('email' = ANY(p_channels) AND wc.email IS NOT NULL AND wc.email != '')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_automation_eligible_leads IS 'Returns leads eligible for automation delivery filtered by channel availability';

-- 7. Create function to mark automation step as completed
CREATE OR REPLACE FUNCTION public.mark_automation_step_completed(
    p_automation_id UUID,
    p_lead_id UUID,
    p_step_number INTEGER,
    p_channel TEXT,
    p_recipient TEXT,
    p_status TEXT DEFAULT 'sent'
) RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
    v_workspace_id UUID;
BEGIN
    -- Get workspace_id from automation
    SELECT workspace_id INTO v_workspace_id
    FROM public.workspace_automations
    WHERE id = p_automation_id;

    -- Insert log entry
    INSERT INTO public.workspace_automation_logs (
        automation_id,
        workspace_id,
        lead_id,
        step_number,
        channel,
        status,
        recipient_identifier,
        sent_at
    ) VALUES (
        p_automation_id,
        v_workspace_id,
        p_lead_id,
        p_step_number,
        p_channel,
        p_status,
        p_recipient,
        CASE WHEN p_status = 'sent' THEN NOW() ELSE NULL END
    ) RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.mark_automation_step_completed IS 'Creates log entry for automation execution with partial completion tracking';

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspace_automations_active ON public.workspace_automations(workspace_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_workspace_automations_trigger ON public.workspace_automations(trigger_type, is_active) WHERE is_active = true;
