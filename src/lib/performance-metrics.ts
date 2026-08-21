/**
 * PHASE 4: Performance Metrics Tracking
 * 
 * Records system health metrics for monitoring and alerting.
 * Works alongside existing telemetry system (system_telemetry_logs).
 */

import { createServiceClient } from '@/lib/supabase/server';

export type MetricType =
  | 'api_latency'
  | 'database_query'
  | 'inngest_duration'
  | 'webhook_latency'
  | 'llm_response_time'
  | 'queue_depth'
  | 'memory_usage'
  | 'cpu_usage';

interface TrackMetricOptions {
  metricType: MetricType;
  value: number;
  unit: string; // 'ms', 'count', 'bytes', 'percent'
  context?: Record<string, unknown>;
  tenantId?: string;
  workspaceId?: string;
}

/**
 * Track a performance metric for system health monitoring
 * 
 * @example
 * ```ts
 * const startTime = Date.now();
 * const result = await fetchData();
 * await trackMetric({
 *   metricType: 'api_latency',
 *   value: Date.now() - startTime,
 *   unit: 'ms',
 *   context: { endpoint: '/api/workspaces' },
 * });
 * ```
 */
export async function trackMetric(options: TrackMetricOptions): Promise<void> {
  const {
    metricType,
    value,
    unit,
    context = {},
    tenantId,
    workspaceId,
  } = options;

  try {
    const db = createServiceClient();

    await db.from('system_health_metrics').insert({
      metric_type: metricType,
      metric_value: value,
      metric_unit: unit,
      context,
      tenant_id: tenantId || null,
      workspace_id: workspaceId || null,
    });
  } catch (err) {
    // Never throw - metrics tracking should not break application flow
    console.error('[metrics] Failed to track metric:', err);
  }
}

/**
 * Performance monitoring wrapper for async functions
 * Automatically tracks execution time
 * 
 * @example
 * ```ts
 * const result = await withMetrics(
 *   { metricType: 'api_latency', context: { route: '/api/chat' } },
 *   async () => processRequest()
 * );
 * ```
 */
export async function withMetrics<T>(
  config: {
    metricType: MetricType;
    context?: Record<string, unknown>;
    tenantId?: string;
    workspaceId?: string;
  },
  handler: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await handler();
    
    // Track successful execution time
    await trackMetric({
      metricType: config.metricType,
      value: Date.now() - startTime,
      unit: 'ms',
      context: { ...config.context, status: 'success' },
      tenantId: config.tenantId,
      workspaceId: config.workspaceId,
    });
    
    return result;
  } catch (error) {
    // Track failed execution time
    await trackMetric({
      metricType: config.metricType,
      value: Date.now() - startTime,
      unit: 'ms',
      context: { ...config.context, status: 'error' },
      tenantId: config.tenantId,
      workspaceId: config.workspaceId,
    });
    
    throw error; // Re-throw after tracking
  }
}

/**
 * Quick wrapper for tracking LLM response times
 */
export async function trackLLMLatency(
  durationMs: number,
  provider: string,
  model: string,
  workspaceId?: string
): Promise<void> {
  await trackMetric({
    metricType: 'llm_response_time',
    value: durationMs,
    unit: 'ms',
    context: { provider, model },
    workspaceId,
  });
}

/**
 * Quick wrapper for tracking webhook processing times
 */
export async function trackWebhookLatency(
  durationMs: number,
  platform: string,
  workspaceId?: string
): Promise<void> {
  await trackMetric({
    metricType: 'webhook_latency',
    value: durationMs,
    unit: 'ms',
    context: { platform },
    workspaceId,
  });
}

/**
 * Quick wrapper for tracking Inngest function duration
 */
export async function trackInngestDuration(
  durationMs: number,
  functionName: string,
  workspaceId?: string
): Promise<void> {
  await trackMetric({
    metricType: 'inngest_duration',
    value: durationMs,
    unit: 'ms',
    context: { functionName },
    workspaceId,
  });
}
