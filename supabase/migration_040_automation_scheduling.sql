-- ============================================
-- MIGRATION 040: AUTOMATION SCHEDULING & STATUS
-- ============================================
-- Adds scheduling capabilities, status tracking, and execution modes
-- to the automation system.

-- Add new columns to workspace_automations
ALTER TABLE workspace_automations 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'scheduled', 'processing', 'completed', 'paused')),
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS automation_type TEXT DEFAULT 'trigger' CHECK (automation_type IN ('trigger', 'instant', 'scheduled', 'drip')),
ADD COLUMN IF NOT EXISTS target_segment TEXT,
ADD COLUMN IF NOT EXISTS lead_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sent_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0;

-- Create index for efficient scheduled automation queries
CREATE INDEX IF NOT EXISTS idx_workspace_automations_scheduled 
ON workspace_automations(scheduled_at, status) 
WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_workspace_automations_status 
ON workspace_automations(workspace_id, status);

-- Add comments for documentation
COMMENT ON COLUMN workspace_automations.status IS 'Current status: draft (not active), active (trigger-based), scheduled (future send), processing (currently sending), completed (one-time send done), paused (temporarily disabled)';
COMMENT ON COLUMN workspace_automations.scheduled_at IS 'For scheduled blasts: when to send. NULL for trigger-based automations.';
COMMENT ON COLUMN workspace_automations.automation_type IS 'Type: trigger (event-based), instant (send now), scheduled (future send), drip (multi-step sequence)';
COMMENT ON COLUMN workspace_automations.target_segment IS 'Optional: target specific lead segment (e.g., "active_chat", "pending_order", "all")';
COMMENT ON COLUMN workspace_automations.lead_count IS 'Cached count of eligible leads for this automation';
COMMENT ON COLUMN workspace_automations.sent_count IS 'Total messages successfully sent';
COMMENT ON COLUMN workspace_automations.failed_count IS 'Total messages that failed to send';

-- Update RLS policies to allow status updates
-- (Existing RLS policies should already cover these columns)

-- Create function to get scheduled automations ready to execute
CREATE OR REPLACE FUNCTION get_scheduled_automations_ready()
RETURNS TABLE (
  id UUID,
  workspace_id UUID,
  name TEXT,
  trigger_type TEXT,
  message_template TEXT,
  channel_filter TEXT[],
  email_subject TEXT,
  batch_size INTEGER,
  rate_limit_delay_ms INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wa.id,
    wa.workspace_id,
    wa.name,
    wa.trigger_type,
    wa.message_template,
    wa.channel_filter,
    wa.email_subject,
    wa.batch_size,
    wa.rate_limit_delay_ms
  FROM workspace_automations wa
  WHERE 
    wa.status = 'scheduled'
    AND wa.scheduled_at <= NOW()
    AND wa.is_active = true
  ORDER BY wa.scheduled_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update automation status after execution
CREATE OR REPLACE FUNCTION update_automation_execution_status(
  p_automation_id UUID,
  p_status TEXT,
  p_sent_count INTEGER DEFAULT 0,
  p_failed_count INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
  UPDATE workspace_automations
  SET 
    status = p_status,
    sent_count = sent_count + p_sent_count,
    failed_count = failed_count + p_failed_count,
    last_executed_at = NOW()
  WHERE id = p_automation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_scheduled_automations_ready() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION update_automation_execution_status(UUID, TEXT, INTEGER, INTEGER) TO authenticated, service_role;
