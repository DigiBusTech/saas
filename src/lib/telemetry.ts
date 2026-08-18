import { createServiceClient } from '@/lib/supabase/server';

export type TelemetrySeverity = 'info' | 'warning' | 'error' | 'critical';
export type TelemetrySource =
  | 'webhook_whatsapp'
  | 'webhook_telegram'
  | 'webhook_stripe'
  | 'webhook_flutterwave'
  | 'llm_router'
  | 'inngest_job'
  | 'vector_embeddings'
  | 'api'
  | 'onboarding_chat';

export interface TelemetryEntry {
  severity: TelemetrySeverity;
  source: TelemetrySource | string;
  message: string;
  endpoint?: string | null;
  stackTrace?: string | null;
  metadata?: Record<string, unknown>;
  workspaceId?: string | null;
  tenantId?: string | null;
  isResolved?: boolean;
}

/**
 * Central telemetry logger. Writes directly to `system_telemetry_logs`.
 *
 * This function NEVER throws — logging must never break the calling code path.
 * It swallows any error and falls back to console output so that wrapping
 * webhooks / API calls / Inngest jobs with error-logging middleware is safe.
 */
export async function logTelemetry(entry: TelemetryEntry): Promise<void> {
  try {
    const db = createServiceClient();
    await db.from('system_telemetry_logs').insert({
      severity: entry.severity,
      source: entry.source,
      message: entry.message?.slice(0, 8000) ?? 'Unknown error',
      endpoint: entry.endpoint ?? null,
      stack_trace: entry.stackTrace ?? null,
      metadata: entry.metadata ?? {},
      workspace_id: entry.workspaceId ?? null,
      tenant_id: entry.tenantId ?? null,
      is_resolved: entry.isResolved ?? false,
    });
  } catch (err) {
    // Logging must never break the caller.
    console.error('[telemetry] Failed to write telemetry log:', err);
    console.error('[telemetry] Original entry:', entry.severity, entry.source, entry.message);
  }
}

/**
 * Extract a normalized message + stack from any thrown value.
 */
export function normalizeError(err: unknown): { message: string; stack: string | null } {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack ?? null };
  }
  if (typeof err === 'string') {
    return { message: err, stack: null };
  }
  try {
    return { message: JSON.stringify(err), stack: null };
  } catch {
    return { message: 'Unknown error', stack: null };
  }
}

/**
 * Error-logging middleware wrapper. Runs an async handler and, if it throws,
 * writes a telemetry entry to `system_telemetry_logs` before re-throwing.
 *
 * Usage:
 *   return withTelemetry({ source: 'webhook_telegram', endpoint: '/api/...' }, async () => { ... });
 */
export async function withTelemetry<T>(
  context: {
    source: TelemetrySource | string;
    endpoint?: string;
    severity?: TelemetrySeverity;
    workspaceId?: string | null;
    tenantId?: string | null;
    rethrow?: boolean;
  },
  handler: () => Promise<T>
): Promise<T | null> {
  try {
    return await handler();
  } catch (err) {
    const { message, stack } = normalizeError(err);
    await logTelemetry({
      severity: context.severity ?? 'error',
      source: context.source,
      endpoint: context.endpoint ?? null,
      message,
      stackTrace: stack,
      workspaceId: context.workspaceId ?? null,
      tenantId: context.tenantId ?? null,
    });
    if (context.rethrow !== false) throw err;
    return null;
  }
}
