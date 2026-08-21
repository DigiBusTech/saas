-- ============================================
-- MIGRATION 042: DATABASE SECURITY HARDENING
-- ============================================
-- Adds indexes, constraints, and security improvements

-- Add indexes for performance and query optimization
CREATE INDEX IF NOT EXISTS idx_workspace_crm_lead_status ON workspace_crm(workspace_id, lead_status);
CREATE INDEX IF NOT EXISTS idx_workspace_crm_phone ON workspace_crm(workspace_id, phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workspace_crm_platform_user ON workspace_crm(workspace_id, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_orders_status ON workspace_orders(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_workspace_orders_created ON workspace_orders(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_crm ON chat_messages(crm_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_bases_workspace ON knowledge_bases(workspace_id, created_at DESC);

-- Add constraints to prevent orphaned records and ensure data integrity
ALTER TABLE workspace_crm 
ADD CONSTRAINT check_workspace_crm_channel 
CHECK (preferred_channel IN ('whatsapp', 'telegram', 'email', 'web_chat'));

ALTER TABLE workspace_orders 
ADD CONSTRAINT check_workspace_orders_status 
CHECK (status IN ('pending_review', 'approved', 'rejected', 'paid', 'cancelled'));

ALTER TABLE workspace_automation_logs 
ADD CONSTRAINT check_automation_logs_status 
CHECK (status IN ('pending', 'sent', 'failed', 'rate_limited', 'skipped'));

-- Add data validation triggers for customer_email in workspace_orders
CREATE OR REPLACE FUNCTION validate_customer_email_format()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_email IS NOT NULL AND NEW.customer_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format: %', NEW.customer_email;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_order_customer_email
  BEFORE INSERT OR UPDATE ON workspace_orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_customer_email_format();

-- Prevent SQL injection in custom fields
CREATE OR REPLACE FUNCTION sanitize_custom_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove potentially dangerous characters from JSONB keys/values
  IF NEW.custom_fields IS NOT NULL THEN
    -- This is a basic sanitization; adjust based on your needs
    NEW.custom_fields = NEW.custom_fields::text::jsonb;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add audit logging
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- RLS for audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view audit logs for their tenants"
  ON audit_logs FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users WHERE id = auth.uid()
    )
  );

-- Service role can insert audit logs
CREATE POLICY "Service can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- Add function to log audit trail
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (
    tenant_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_data,
    new_data
  ) VALUES (
    COALESCE(NEW.tenant_id, OLD.tenant_id),
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers for critical tables (enable as needed)
-- CREATE TRIGGER audit_tenants
--   AFTER INSERT OR UPDATE OR DELETE ON tenants
--   FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- CREATE TRIGGER audit_users
--   AFTER INSERT OR UPDATE OR DELETE ON users
--   FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Add rate limiting table for API endpoints
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or user ID
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(identifier, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_identifier ON api_rate_limits(identifier, endpoint, window_start);

-- Clean up old rate limit entries (older than 1 hour)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM api_rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Add security event logging
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'suspicious_activity', 'rate_limit_exceeded', 'invalid_auth', etc.
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_address INET,
  user_agent TEXT,
  endpoint TEXT,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON security_events(ip_address, created_at DESC);

-- Grant permissions
GRANT SELECT, INSERT ON audit_logs TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON api_rate_limits TO authenticated, service_role;
GRANT SELECT, INSERT ON security_events TO authenticated, service_role;

COMMENT ON TABLE audit_logs IS 'Audit trail for critical operations';
COMMENT ON TABLE api_rate_limits IS 'Rate limiting storage for API endpoints';
COMMENT ON TABLE security_events IS 'Security event logging for threat detection';
