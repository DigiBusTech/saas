-- =========================================================================
-- Migration 037: Phase 4 - Help Center & Performance Metrics
-- Documentation system and performance monitoring (no duplicate error tables)
-- =========================================================================

-- 1. Create help_articles table for documentation/knowledge base
CREATE TABLE IF NOT EXISTS public.help_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL CHECK (category IN ('getting_started', 'integrations', 'billing', 'crm', 'analytics', 'troubleshooting', 'api', 'legal', 'sabibio', 'web_chat')),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    search_vector tsvector,
    author_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    view_count INTEGER NOT NULL DEFAULT 0,
    helpful_count INTEGER NOT NULL DEFAULT 0,
    not_helpful_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.help_articles IS 'PHASE 4: Knowledge base articles for help center and documentation';
COMMENT ON COLUMN public.help_articles.search_vector IS 'Full-text search index for article content';
COMMENT ON COLUMN public.help_articles.helpful_count IS 'Number of users who found this article helpful';

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_help_articles_search ON public.help_articles USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_help_articles_category ON public.help_articles(category, is_published);
CREATE INDEX IF NOT EXISTS idx_help_articles_published ON public.help_articles(is_published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON public.help_articles(slug);

-- Trigger to update search vector
CREATE OR REPLACE FUNCTION public.update_help_article_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.title, '') || ' ' || 
        COALESCE(NEW.content, '') || ' ' || 
        COALESCE(NEW.excerpt, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_help_search_vector ON public.help_articles;

CREATE TRIGGER trigger_update_help_search_vector
    BEFORE INSERT OR UPDATE ON public.help_articles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_help_article_search_vector();

-- Trigger for updated_at
CREATE TRIGGER set_help_articles_updated_at
    BEFORE UPDATE ON public.help_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS policies
ALTER TABLE public.help_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_help_full_access" ON public.help_articles
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    );

CREATE POLICY "anyone_read_published_help" ON public.help_articles
    FOR SELECT USING (is_published = TRUE);

-- 2. Create system_health_metrics table for performance monitoring
CREATE TABLE IF NOT EXISTS public.system_health_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type TEXT NOT NULL CHECK (metric_type IN ('api_latency', 'database_query', 'inngest_duration', 'webhook_latency', 'llm_response_time', 'queue_depth', 'memory_usage', 'cpu_usage')),
    metric_value NUMERIC NOT NULL,
    metric_unit TEXT NOT NULL, -- 'ms', 'count', 'bytes', 'percent', etc.
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    context JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.system_health_metrics IS 'PHASE 4: Performance metrics for system health monitoring and alerting';
COMMENT ON COLUMN public.system_health_metrics.metric_type IS 'Type of performance metric being tracked';
COMMENT ON COLUMN public.system_health_metrics.metric_value IS 'Numeric value of the metric';
COMMENT ON COLUMN public.system_health_metrics.context IS 'Additional context (endpoint, function name, etc.)';

-- Indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_system_health_created ON public.system_health_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_type ON public.system_health_metrics(metric_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_tenant ON public.system_health_metrics(tenant_id, created_at DESC);

-- RLS policies
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_health_metrics_access" ON public.system_health_metrics
    FOR ALL USING (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    );

CREATE POLICY "tenant_admin_own_health_metrics" ON public.system_health_metrics
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM public.users WHERE id = auth.uid() AND role = 'tenant_admin'
        )
    );

-- 3. Create RPC for help article search
CREATE OR REPLACE FUNCTION public.search_help_articles(
    search_query TEXT,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    excerpt TEXT,
    slug TEXT,
    category TEXT,
    relevance REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ha.id,
        ha.title,
        ha.excerpt,
        ha.slug,
        ha.category,
        ts_rank(ha.search_vector, plainto_tsquery('english', search_query)) AS relevance
    FROM public.help_articles ha
    WHERE ha.is_published = TRUE
      AND ha.search_vector @@ plainto_tsquery('english', search_query)
    ORDER BY relevance DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.search_help_articles IS 'PHASE 4: Full-text search for help articles';

-- 4. Create RPC for system performance overview
CREATE OR REPLACE FUNCTION public.get_performance_metrics(
    p_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    avg_api_latency NUMERIC,
    max_api_latency NUMERIC,
    avg_llm_response_time NUMERIC,
    avg_database_query_time NUMERIC,
    total_metrics_recorded BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT AVG(metric_value) FROM public.system_health_metrics 
         WHERE metric_type = 'api_latency' 
           AND created_at >= now() - (p_hours || ' hours')::INTERVAL)::NUMERIC AS avg_api_latency,
        
        (SELECT MAX(metric_value) FROM public.system_health_metrics 
         WHERE metric_type = 'api_latency' 
           AND created_at >= now() - (p_hours || ' hours')::INTERVAL)::NUMERIC AS max_api_latency,
        
        (SELECT AVG(metric_value) FROM public.system_health_metrics 
         WHERE metric_type = 'llm_response_time' 
           AND created_at >= now() - (p_hours || ' hours')::INTERVAL)::NUMERIC AS avg_llm_response_time,
        
        (SELECT AVG(metric_value) FROM public.system_health_metrics 
         WHERE metric_type = 'database_query' 
           AND created_at >= now() - (p_hours || ' hours')::INTERVAL)::NUMERIC AS avg_database_query_time,
        
        (SELECT COUNT(*) FROM public.system_health_metrics 
         WHERE created_at >= now() - (p_hours || ' hours')::INTERVAL)::BIGINT AS total_metrics_recorded;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_performance_metrics IS 'PHASE 4: Get aggregated performance metrics for monitoring dashboard';

-- 5. Enhance existing system_telemetry_logs with resolution workflow
-- Add columns if they don't already exist
ALTER TABLE public.system_telemetry_logs
    ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolution_notes TEXT;

COMMENT ON COLUMN public.system_telemetry_logs.resolved_by IS 'PHASE 4: User who resolved this error';
COMMENT ON COLUMN public.system_telemetry_logs.resolution_notes IS 'PHASE 4: Notes about how the error was resolved';

-- 6. Seed initial help articles
INSERT INTO public.help_articles (category, title, slug, content, excerpt, is_published) VALUES
('getting_started', 'Welcome to SabiBio', 'welcome-to-sabibio', 
'# Welcome to SabiBio

SabiBio is your all-in-one AI-powered business platform. This guide will help you get started.

## Quick Start
1. Create your first workspace
2. Configure your SabiBio page
3. Set up integrations (WhatsApp, Telegram)
4. Train your AI assistant

## Next Steps
- Customize your branding
- Add products and services
- Configure automation rules
- Monitor analytics', 
'Get started with SabiBio in minutes. Complete setup guide for new users.', 
TRUE),

('sabibio', 'How to Customize Your SabiBio Page', 'customize-sabibio-page',
'# Customizing Your SabiBio Page

Your SabiBio page is your digital business card. Here''s how to make it yours.

## Branding
- Upload your logo
- Choose your color scheme
- Select fonts and styles

## Content
- Add custom links
- Showcase products
- Highlight services
- Display social media

## SEO & Analytics
- Set page title and description
- Track visitor engagement
- Monitor link clicks',
'Complete guide to customizing your SabiBio landing page with branding and content.',
TRUE),

('web_chat', 'Embedding the Web Chat Widget', 'embed-web-chat-widget',
'# Embedding the Web Chat Widget

Add live chat to any website with our embeddable widget.

## Installation
Copy this code and paste before `</body>`:

```html
<script src="https://yourapp.com/widget.js" 
        data-workspace-id="your-workspace-id">
</script>
```

## Customization
- Set welcome message
- Customize colors
- Configure position
- Add pre-chat form

## Tracking
- Session-based visitor recognition
- Lead capture
- Analytics integration',
'Step-by-step guide to embedding the web chat widget on your website.',
TRUE),

('integrations', 'WhatsApp Business Integration', 'whatsapp-integration',
'# WhatsApp Business API Integration

Connect your WhatsApp Business account to automate customer conversations.

## Requirements
- WhatsApp Business API access
- Meta Business Manager account
- Phone number verification

## Setup Steps
1. Get your Phone Number ID
2. Generate Access Token
3. Configure Webhook
4. Test integration

## Features
- Automated responses
- Product catalog
- Order management
- CRM integration',
'Connect WhatsApp Business API to automate customer conversations.',
TRUE),

('troubleshooting', 'Common Setup Issues', 'common-setup-issues',
'# Troubleshooting Common Issues

Solutions to frequently encountered setup problems.

## Dashboard Not Loading
- Clear browser cache
- Check internet connection
- Verify account status

## Messages Not Sending
- Verify API credentials
- Check rate limits
- Review error logs

## Widget Not Appearing
- Validate workspace ID
- Check script placement
- Verify domain whitelist

## Contact Support
If issues persist, contact support@sabibio.com',
'Quick fixes for common setup and configuration issues.',
TRUE)

ON CONFLICT (slug) DO NOTHING;

-- 7. Grant necessary permissions
GRANT SELECT ON public.help_articles TO authenticated, anon;
GRANT SELECT, INSERT ON public.system_health_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_help_articles TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_performance_metrics TO authenticated;

-- 8. Enable realtime for help articles (for admin preview)
ALTER PUBLICATION supabase_realtime ADD TABLE public.help_articles;
