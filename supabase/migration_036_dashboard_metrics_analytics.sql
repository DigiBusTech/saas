-- =========================================================================
-- Migration 036: Dashboard Metrics & SabiBio Analytics
-- Real-time notifications, workspace analytics, and metrics RPC fixes
-- =========================================================================

-- 1. Create workspace_analytics table for SabiBio page tracking
CREATE TABLE IF NOT EXISTS public.workspace_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'link_click', 'product_view', 'service_view', 'channel_click', 'form_submit')),
    event_data JSONB DEFAULT '{}'::JSONB,
    visitor_session_id TEXT,
    visitor_ip TEXT,
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.workspace_analytics IS 'PHASE 3: SabiBio page view and interaction tracking';
COMMENT ON COLUMN public.workspace_analytics.event_type IS 'Type of analytics event (page_view, link_click, etc.)';
COMMENT ON COLUMN public.workspace_analytics.event_data IS 'Additional event metadata (link_url, product_id, etc.)';

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_workspace_analytics_workspace ON public.workspace_analytics(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_analytics_event_type ON public.workspace_analytics(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_analytics_session ON public.workspace_analytics(visitor_session_id, created_at DESC);

-- RLS policies
ALTER TABLE public.workspace_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_workspace_analytics_access" ON public.workspace_analytics
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid()
        )
    );

-- 2. Create optimized RPC for dashboard metrics
CREATE OR REPLACE FUNCTION public.get_workspace_metrics(p_workspace_id UUID)
RETURNS TABLE (
    total_leads BIGINT,
    total_messages BIGINT,
    total_orders BIGINT,
    active_conversations BIGINT,
    page_views_today BIGINT,
    page_views_week BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.workspace_crm WHERE workspace_id = p_workspace_id)::BIGINT AS total_leads,
        (SELECT COUNT(*) FROM public.chat_messages WHERE workspace_id = p_workspace_id)::BIGINT AS total_messages,
        (SELECT COUNT(*) FROM public.workspace_orders WHERE workspace_id = p_workspace_id)::BIGINT AS total_orders,
        (SELECT COUNT(*) FROM public.conversations WHERE workspace_id = p_workspace_id AND status IN ('ai_active', 'human_handoff'))::BIGINT AS active_conversations,
        (SELECT COUNT(*) FROM public.workspace_analytics WHERE workspace_id = p_workspace_id AND event_type = 'page_view' AND created_at >= now() - INTERVAL '1 day')::BIGINT AS page_views_today,
        (SELECT COUNT(*) FROM public.workspace_analytics WHERE workspace_id = p_workspace_id AND event_type = 'page_view' AND created_at >= now() - INTERVAL '7 days')::BIGINT AS page_views_week;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_workspace_metrics IS 'PHASE 3: Optimized single-query metrics fetch for dashboard overview';

-- 3. Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    new_messages BOOLEAN NOT NULL DEFAULT TRUE,
    new_leads BOOLEAN NOT NULL DEFAULT TRUE,
    new_orders BOOLEAN NOT NULL DEFAULT TRUE,
    ai_escalations BOOLEAN NOT NULL DEFAULT TRUE,
    email_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, workspace_id)
);

COMMENT ON TABLE public.notification_preferences IS 'PHASE 3: User notification preferences for real-time alerts';

-- Trigger for updated_at
CREATE TRIGGER set_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_notification_prefs" ON public.notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- 4. Create notifications table for toast display
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('new_message', 'new_lead', 'new_order', 'ai_escalation', 'system_alert')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'PHASE 3: In-app notification queue for toast alerts';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace ON public.notifications(workspace_id, created_at DESC);

-- RLS policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_notifications" ON public.notifications
    FOR ALL USING (user_id = auth.uid());

-- 5. Create function to notify user on new message
CREATE OR REPLACE FUNCTION public.notify_user_new_message()
RETURNS TRIGGER AS $$
DECLARE
    v_workspace_id UUID;
    v_workspace_name TEXT;
    v_sender_name TEXT;
    v_user_ids UUID[];
BEGIN
    -- Only notify on inbound user messages
    IF NEW.sender_type != 'user' THEN
        RETURN NEW;
    END IF;

    -- Get workspace info
    SELECT c.workspace_id, w.name INTO v_workspace_id, v_workspace_name
    FROM public.conversations c
    JOIN public.workspaces w ON w.id = c.workspace_id
    WHERE c.id = NEW.conversation_id;

    IF v_workspace_id IS NULL THEN
        RETURN NEW;
    END IF;

    v_sender_name := COALESCE(NEW.sender_name, 'Unknown');

    -- Find all users with access to this workspace who want notifications
    SELECT ARRAY_AGG(DISTINCT u.id) INTO v_user_ids
    FROM public.users u
    WHERE u.tenant_id IN (SELECT tenant_id FROM public.workspaces WHERE id = v_workspace_id)
      AND u.role IN ('tenant_admin', 'super_admin')
      AND NOT EXISTS (
          SELECT 1 FROM public.notification_preferences np
          WHERE np.user_id = u.id
            AND (np.workspace_id = v_workspace_id OR np.workspace_id IS NULL)
            AND np.new_messages = FALSE
      );

    -- Create notifications
    IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
        INSERT INTO public.notifications (user_id, workspace_id, notification_type, title, message, metadata)
        SELECT
            unnest(v_user_ids),
            v_workspace_id,
            'new_message',
            'New Message',
            v_sender_name || ' sent a message in ' || v_workspace_name,
            jsonb_build_object('conversation_id', NEW.conversation_id, 'message_id', NEW.id);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.notify_user_new_message IS 'PHASE 3: Create in-app notification when customer sends message';

-- Create trigger for new messages
DROP TRIGGER IF EXISTS trigger_notify_new_message ON public.messages;

CREATE TRIGGER trigger_notify_new_message
    AFTER INSERT ON public.messages
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_user_new_message();

-- 6. Create function to notify on new lead
CREATE OR REPLACE FUNCTION public.notify_user_new_lead()
RETURNS TRIGGER AS $$
DECLARE
    v_workspace_name TEXT;
    v_user_ids UUID[];
BEGIN
    -- Get workspace name
    SELECT name INTO v_workspace_name
    FROM public.workspaces
    WHERE id = NEW.workspace_id;

    IF v_workspace_name IS NULL THEN
        RETURN NEW;
    END IF;

    -- Find users with notification preferences
    SELECT ARRAY_AGG(DISTINCT u.id) INTO v_user_ids
    FROM public.users u
    WHERE u.tenant_id = NEW.tenant_id
      AND u.role IN ('tenant_admin', 'super_admin')
      AND NOT EXISTS (
          SELECT 1 FROM public.notification_preferences np
          WHERE np.user_id = u.id
            AND (np.workspace_id = NEW.workspace_id OR np.workspace_id IS NULL)
            AND np.new_leads = FALSE
      );

    -- Create notifications
    IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
        INSERT INTO public.notifications (user_id, workspace_id, notification_type, title, message, metadata)
        SELECT
            unnest(v_user_ids),
            NEW.workspace_id,
            'new_lead',
            'New Lead',
            COALESCE(NEW.customer_name, 'New contact') || ' via ' || v_workspace_name,
            jsonb_build_object('crm_id', NEW.id, 'channel_type', NEW.channel_type);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.notify_user_new_lead IS 'PHASE 3: Create in-app notification when new CRM lead is created';

-- Create trigger for new leads
DROP TRIGGER IF EXISTS trigger_notify_new_lead ON public.workspace_crm;

CREATE TRIGGER trigger_notify_new_lead
    AFTER INSERT ON public.workspace_crm
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_user_new_lead();

-- 7. Grant necessary permissions
GRANT SELECT ON public.workspace_analytics TO authenticated;
GRANT INSERT ON public.workspace_analytics TO anon, authenticated; -- Allow public tracking
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_workspace_metrics TO authenticated;
