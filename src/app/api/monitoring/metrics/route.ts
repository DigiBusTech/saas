import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * GET /api/monitoring/metrics
 * 
 * Production monitoring metrics endpoint
 * Provides Prometheus-compatible metrics for observability
 */
export async function GET() {
  try {
    const metrics: Record<string, any> = {};
    const supabase = createServiceClient();

    // 1. Total counts
    const [
      { count: totalTenants },
      { count: totalWorkspaces },
      { count: totalLeads },
      { count: totalOrders },
      { count: totalAutomations },
    ] = await Promise.all([
      supabase.from('tenants').select('*', { count: 'exact', head: true }),
      supabase.from('workspaces').select('*', { count: 'exact', head: true }),
      supabase.from('workspace_crm').select('*', { count: 'exact', head: true }),
      supabase.from('workspace_orders').select('*', { count: 'exact', head: true }),
      supabase.from('workspace_automations').select('*', { count: 'exact', head: true }),
    ]);

    metrics.counts = {
      tenants: totalTenants || 0,
      workspaces: totalWorkspaces || 0,
      leads: totalLeads || 0,
      orders: totalOrders || 0,
      automations: totalAutomations || 0,
    };

    // 2. Active automations by status
    const { data: automationsByStatus } = await supabase
      .from('workspace_automations')
      .select('status');

    metrics.automations_by_status = automationsByStatus?.reduce((acc: any, auto: any) => {
      acc[auto.status] = (acc[auto.status] || 0) + 1;
      return acc;
    }, {});

    // 3. Recent activity (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: newLeadsToday },
      { count: newOrdersToday },
      { count: messagesProcessedToday },
    ] = await Promise.all([
      supabase.from('workspace_crm').select('*', { count: 'exact', head: true }).gte('created_at', yesterday),
      supabase.from('workspace_orders').select('*', { count: 'exact', head: true }).gte('created_at', yesterday),
      supabase.from('workspace_automation_logs').select('*', { count: 'exact', head: true }).gte('created_at', yesterday),
    ]);

    metrics.last_24h = {
      new_leads: newLeadsToday || 0,
      new_orders: newOrdersToday || 0,
      messages_processed: messagesProcessedToday || 0,
    };

    // 4. Automation performance
    const { data: automationLogs } = await supabase
      .from('workspace_automation_logs')
      .select('status')
      .gte('created_at', yesterday);

    metrics.automation_performance = automationLogs?.reduce((acc: any, log: any) => {
      acc[log.status] = (acc[log.status] || 0) + 1;
      return acc;
    }, {}) || {};

    // 5. System health indicators
    const { data: failedAutomations } = await supabase
      .from('workspace_automations')
      .select('id, title, status')
      .eq('status', 'processing')
      .lt('last_executed_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()); // Stuck for >1 hour

    metrics.alerts = {
      stuck_automations: failedAutomations?.length || 0,
    };

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      metrics,
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to fetch metrics',
      message: error.message,
    }, {
      status: 500,
    });
  }
}
