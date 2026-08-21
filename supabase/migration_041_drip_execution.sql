-- ============================================
-- MIGRATION 041: DRIP SEQUENCE EXECUTION
-- ============================================
-- Adds multi-step drip automation execution with delay tracking

-- Create table for tracking drip progress per lead
CREATE TABLE IF NOT EXISTS workspace_automation_drip_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES workspace_automations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES workspace_crm(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  current_step INTEGER NOT NULL DEFAULT 1,
  next_scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(automation_id, lead_id)
);

-- Create index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_drip_progress_scheduled 
ON workspace_automation_drip_progress(next_scheduled_at, status) 
WHERE status = 'active';

-- Create index for workspace queries
CREATE INDEX IF NOT EXISTS idx_drip_progress_workspace 
ON workspace_automation_drip_progress(workspace_id, automation_id);

-- Add delivery_time column to automation_steps (e.g., "09:00" for 9 AM)
ALTER TABLE workspace_automation_steps 
ADD COLUMN IF NOT EXISTS delivery_time TIME;

-- Create function to enroll leads in drip sequence
CREATE OR REPLACE FUNCTION enroll_leads_in_drip(
  p_automation_id UUID,
  p_workspace_id UUID
)
RETURNS TABLE (
  enrolled_count INTEGER,
  already_enrolled INTEGER
) AS $$
DECLARE
  v_enrolled INTEGER := 0;
  v_already_enrolled INTEGER := 0;
  v_lead RECORD;
  v_first_step RECORD;
BEGIN
  -- Get first step details
  SELECT step_number, delay_minutes, delivery_time
  INTO v_first_step
  FROM workspace_automation_steps
  WHERE automation_id = p_automation_id
  ORDER BY step_number ASC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No steps found for automation %', p_automation_id;
  END IF;

  -- Get automation details for channel filtering
  FOR v_lead IN
    SELECT DISTINCT wc.id as lead_id
    FROM workspace_crm wc
    WHERE wc.workspace_id = p_workspace_id
      AND wc.lead_status = 'active_chat'
      AND NOT EXISTS (
        SELECT 1 FROM workspace_automation_drip_progress wadp
        WHERE wadp.automation_id = p_automation_id
          AND wadp.lead_id = wc.id
          AND wadp.status IN ('active', 'paused')
      )
  LOOP
    -- Calculate next scheduled time
    DECLARE
      v_next_scheduled TIMESTAMPTZ;
    BEGIN
      IF v_first_step.delivery_time IS NOT NULL THEN
        -- Schedule for next occurrence of delivery_time
        v_next_scheduled := (CURRENT_DATE + v_first_step.delivery_time::TIME)::TIMESTAMPTZ;
        IF v_next_scheduled <= NOW() THEN
          v_next_scheduled := v_next_scheduled + INTERVAL '1 day';
        END IF;
      ELSE
        -- Schedule based on delay
        v_next_scheduled := NOW() + (v_first_step.delay_minutes || ' minutes')::INTERVAL;
      END IF;

      -- Insert progress record
      INSERT INTO workspace_automation_drip_progress (
        automation_id,
        lead_id,
        workspace_id,
        current_step,
        next_scheduled_at,
        status
      ) VALUES (
        p_automation_id,
        v_lead.lead_id,
        p_workspace_id,
        1,
        v_next_scheduled,
        'active'
      )
      ON CONFLICT (automation_id, lead_id) DO NOTHING;

      IF FOUND THEN
        v_enrolled := v_enrolled + 1;
      ELSE
        v_already_enrolled := v_already_enrolled + 1;
      END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT v_enrolled, v_already_enrolled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get drip messages ready to send
CREATE OR REPLACE FUNCTION get_drip_messages_ready()
RETURNS TABLE (
  progress_id UUID,
  automation_id UUID,
  workspace_id UUID,
  lead_id UUID,
  step_number INTEGER,
  message_template TEXT,
  channel_filter TEXT[],
  email_subject TEXT,
  media_url TEXT,
  cta_button_text TEXT,
  cta_link TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wadp.id as progress_id,
    wadp.automation_id,
    wadp.workspace_id,
    wadp.lead_id,
    wadp.current_step as step_number,
    was.message_template,
    wa.channel_filter,
    wa.email_subject,
    wa.media_url,
    wa.cta_button_text,
    wa.cta_link
  FROM workspace_automation_drip_progress wadp
  JOIN workspace_automation_steps was 
    ON wadp.automation_id = was.automation_id 
    AND wadp.current_step = was.step_number
  JOIN workspace_automations wa 
    ON wadp.automation_id = wa.id
  WHERE 
    wadp.status = 'active'
    AND wadp.next_scheduled_at <= NOW()
    AND wa.is_active = true
    AND wa.automation_type = 'drip'
  ORDER BY wadp.next_scheduled_at ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to advance drip progress
CREATE OR REPLACE FUNCTION advance_drip_progress(
  p_progress_id UUID,
  p_send_status TEXT -- 'sent' or 'failed'
)
RETURNS VOID AS $$
DECLARE
  v_progress RECORD;
  v_next_step RECORD;
  v_total_steps INTEGER;
BEGIN
  -- Get current progress
  SELECT * INTO v_progress
  FROM workspace_automation_drip_progress
  WHERE id = p_progress_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Drip progress % not found', p_progress_id;
  END IF;

  -- If send failed, keep on same step and retry in 1 hour
  IF p_send_status = 'failed' THEN
    UPDATE workspace_automation_drip_progress
    SET next_scheduled_at = NOW() + INTERVAL '1 hour',
        updated_at = NOW()
    WHERE id = p_progress_id;
    RETURN;
  END IF;

  -- Get total steps
  SELECT COUNT(*) INTO v_total_steps
  FROM workspace_automation_steps
  WHERE automation_id = v_progress.automation_id;

  -- Check if this was the last step
  IF v_progress.current_step >= v_total_steps THEN
    -- Mark as completed
    UPDATE workspace_automation_drip_progress
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = p_progress_id;
    RETURN;
  END IF;

  -- Get next step details
  SELECT step_number, delay_minutes, delivery_time
  INTO v_next_step
  FROM workspace_automation_steps
  WHERE automation_id = v_progress.automation_id
    AND step_number = v_progress.current_step + 1
  LIMIT 1;

  IF NOT FOUND THEN
    -- No more steps, mark completed
    UPDATE workspace_automation_drip_progress
    SET status = 'completed',
        updated_at = NOW()
    WHERE id = p_progress_id;
    RETURN;
  END IF;

  -- Calculate next scheduled time
  DECLARE
    v_next_scheduled TIMESTAMPTZ;
  BEGIN
    IF v_next_step.delivery_time IS NOT NULL THEN
      -- Schedule for next occurrence of delivery_time
      v_next_scheduled := (CURRENT_DATE + v_next_step.delivery_time::TIME)::TIMESTAMPTZ;
      -- Add delay_minutes as days offset
      IF v_next_step.delay_minutes IS NOT NULL AND v_next_step.delay_minutes > 0 THEN
        v_next_scheduled := v_next_scheduled + (v_next_step.delay_minutes || ' minutes')::INTERVAL;
      END IF;
      -- If in the past, add 1 day
      IF v_next_scheduled <= NOW() THEN
        v_next_scheduled := v_next_scheduled + INTERVAL '1 day';
      END IF;
    ELSE
      -- Schedule based on delay from now
      v_next_scheduled := NOW() + (v_next_step.delay_minutes || ' minutes')::INTERVAL;
    END IF;

    -- Update progress to next step
    UPDATE workspace_automation_drip_progress
    SET current_step = v_progress.current_step + 1,
        next_scheduled_at = v_next_scheduled,
        updated_at = NOW()
    WHERE id = p_progress_id;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION enroll_leads_in_drip(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_drip_messages_ready() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION advance_drip_progress(UUID, TEXT) TO authenticated, service_role;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON workspace_automation_drip_progress TO authenticated, service_role;

-- Add RLS policies for drip progress
ALTER TABLE workspace_automation_drip_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view drip progress for their workspaces"
  ON workspace_automation_drip_progress FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE tenant_id IN (
        SELECT tenant_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage drip progress for their workspaces"
  ON workspace_automation_drip_progress FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM workspaces 
      WHERE tenant_id IN (
        SELECT tenant_id FROM users 
        WHERE id = auth.uid() 
        AND role IN ('tenant_admin', 'super_admin')
      )
    )
  );

CREATE POLICY "Service role can manage drip progress"
  ON workspace_automation_drip_progress FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE workspace_automation_drip_progress IS 'Tracks multi-step drip sequence progress per lead';
COMMENT ON FUNCTION enroll_leads_in_drip IS 'Enrolls eligible leads into a drip sequence';
COMMENT ON FUNCTION get_drip_messages_ready IS 'Returns drip messages ready to send (next_scheduled_at <= NOW)';
COMMENT ON FUNCTION advance_drip_progress IS 'Advances lead to next step or marks completed';
