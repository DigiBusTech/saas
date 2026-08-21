-- =========================================================================
-- Migration 035: CRM Identity Resolution & Web Chat Tracking
-- IP address, session ID, and automatic lead status management
-- =========================================================================

-- 1. Extend workspace_crm with identity tracking fields
ALTER TABLE public.workspace_crm
    ADD COLUMN IF NOT EXISTS ip_address TEXT,
    ADD COLUMN IF NOT EXISTS session_id TEXT,
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS first_message_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS user_agent TEXT;

COMMENT ON COLUMN public.workspace_crm.ip_address IS 'IP address of web chat visitor for session tracking';
COMMENT ON COLUMN public.workspace_crm.session_id IS 'Unique session identifier for visitor recognition';
COMMENT ON COLUMN public.workspace_crm.last_seen_at IS 'Last activity timestamp for presence tracking';
COMMENT ON COLUMN public.workspace_crm.first_message_at IS 'Timestamp of first message sent';
COMMENT ON COLUMN public.workspace_crm.user_agent IS 'Browser user agent string for device tracking';

-- Create index on session_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_workspace_crm_session_id ON public.workspace_crm(session_id);
CREATE INDEX IF NOT EXISTS idx_workspace_crm_last_seen ON public.workspace_crm(last_seen_at DESC);

-- 2. Add conversation_count to track engagement level
ALTER TABLE public.workspace_crm
    ADD COLUMN IF NOT EXISTS conversation_count INT DEFAULT 0;

COMMENT ON COLUMN public.workspace_crm.conversation_count IS 'Number of conversations this lead has initiated';

-- 3. Create function to auto-update lead status based on activity
CREATE OR REPLACE FUNCTION public.update_lead_status_on_message()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new message is created, update the lead status
    UPDATE public.workspace_crm
    SET 
        lead_status = CASE
            WHEN lead_status = 'new' THEN 'active_chat'
            WHEN lead_status = 'contacted' THEN 'active_chat'
            ELSE lead_status
        END,
        last_seen_at = now(),
        conversation_count = CASE
            WHEN first_message_at IS NULL THEN 1
            ELSE conversation_count
        END,
        first_message_at = COALESCE(first_message_at, now())
    WHERE workspace_id = NEW.workspace_id
      AND channel_user_id = NEW.sender_id
      AND channel_type = NEW.channel;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_lead_status_on_message IS 'PHASE 2: Auto-update lead status from new → active_chat when messages are sent';

-- 4. Create trigger on chat_messages for automatic status updates
DROP TRIGGER IF EXISTS trigger_update_lead_status ON public.chat_messages;

CREATE TRIGGER trigger_update_lead_status
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    WHEN (NEW.role = 'user')
    EXECUTE FUNCTION public.update_lead_status_on_message();

COMMENT ON TRIGGER trigger_update_lead_status ON public.chat_messages IS 'Updates workspace_crm lead_status and activity timestamps on new customer messages';

-- 5. Create function to find or create CRM lead by session ID
CREATE OR REPLACE FUNCTION public.get_or_create_lead_by_session(
    p_workspace_id UUID,
    p_session_id TEXT,
    p_channel_type TEXT DEFAULT 'web_chat',
    p_ip_address TEXT DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_lead_id UUID;
BEGIN
    -- Try to find existing lead by session_id
    SELECT id INTO v_lead_id
    FROM public.workspace_crm
    WHERE workspace_id = p_workspace_id
      AND session_id = p_session_id
      AND channel_type = p_channel_type
    LIMIT 1;

    -- If found, update last_seen_at
    IF v_lead_id IS NOT NULL THEN
        UPDATE public.workspace_crm
        SET last_seen_at = now()
        WHERE id = v_lead_id;
        
        RETURN v_lead_id;
    END IF;

    -- Otherwise create new lead
    INSERT INTO public.workspace_crm (
        workspace_id,
        channel_type,
        channel_user_id,
        session_id,
        ip_address,
        user_agent,
        lead_status,
        first_message_at,
        last_seen_at,
        conversation_count
    ) VALUES (
        p_workspace_id,
        p_channel_type,
        p_session_id, -- Use session_id as channel_user_id for web chat
        p_session_id,
        p_ip_address,
        p_user_agent,
        'new',
        now(),
        now(),
        0
    )
    RETURNING id INTO v_lead_id;

    RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_or_create_lead_by_session IS 'PHASE 2: Find existing lead by session ID or create new one with tracking data';

-- 6. Backfill first_message_at for existing leads
UPDATE public.workspace_crm
SET first_message_at = created_at
WHERE first_message_at IS NULL;
