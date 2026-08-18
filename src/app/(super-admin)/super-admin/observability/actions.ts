'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { executeLLMRequest } from '@/lib/ai/router';
import { logTelemetry, normalizeError } from '@/lib/telemetry';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';

export interface TelemetryLog {
  id: string;
  workspace_id: string | null;
  tenant_id: string | null;
  severity: string;
  source: string;
  endpoint: string | null;
  message: string;
  stack_trace: string | null;
  metadata: Record<string, unknown>;
  ai_diagnosis: string | null;
  is_resolved: boolean;
  created_at: string;
}

export interface HealthOverview {
  totalApiCalls24h: number;
  webhookSuccessRate: number;
  activeWarnings: number;
  unresolvedErrors: number;
}

/**
 * Compute system health overview cards for the last 24h.
 */
export async function getHealthOverview(): Promise<HealthOverview> {
  await requireSuperAdmin();
  const supabase = createServiceClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('system_telemetry_logs')
    .select('severity, source, is_resolved, created_at')
    .gte('created_at', since);

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to load telemetry health');
  }

  const totalApiCalls24h = data.length;
  const activeWarnings = data.filter((l) => l.severity === 'warning' && !l.is_resolved).length;
  const unresolvedErrors = data.filter(
    (l) => (l.severity === 'error' || l.severity === 'critical') && !l.is_resolved
  ).length;

  // Webhook success rate: webhook-sourced logs that are NOT errors vs. total webhook logs.
  const webhookLogs = data.filter((l) => String(l.source).startsWith('webhook'));
  const webhookErrors = webhookLogs.filter(
    (l) => l.severity === 'error' || l.severity === 'critical'
  ).length;
  const webhookSuccessRate =
    webhookLogs.length === 0
      ? 100
      : Math.round(((webhookLogs.length - webhookErrors) / webhookLogs.length) * 100);

  return { totalApiCalls24h, webhookSuccessRate, activeWarnings, unresolvedErrors };
}

/**
 * Fetch the most recent telemetry logs (initial load; realtime handles updates).
 */
export async function getTelemetryLogs(limit = 100): Promise<{ logs: TelemetryLog[]; error: string | null }> {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { logs: [], error: guard.error };
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('system_telemetry_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { logs: [], error: error.message };
  return { logs: (data ?? []) as TelemetryLog[], error: null };
}

/**
 * AI Self-Healing Diagnosis — analyze a stack trace and produce actionable fix steps.
 * Persists the result to `ai_diagnosis` on the log row.
 */
export async function runAiDiagnosis(logId: string) {
  try {
    const guard = await requireSuperAdmin();
    if ('error' in guard) return { error: guard.error };
    const supabase = createServiceClient();
    const { data: log, error } = await supabase
      .from('system_telemetry_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (error || !log) return { error: 'Log not found' };

    const systemInstruction =
      'You are a senior site-reliability engineer. Analyze the provided error log from a ' +
      'multi-tenant SaaS platform (Next.js, Supabase/pgvector, Inngest, OpenAI-compatible LLM router). ' +
      'Respond with a concise root-cause analysis followed by a numbered list of concrete, actionable ' +
      'fix steps. Keep it under 200 words.';

    const prompt = [
      `Source: ${log.source}`,
      `Severity: ${log.severity}`,
      `Endpoint: ${log.endpoint ?? 'n/a'}`,
      `Message: ${log.message}`,
      `Stack Trace:\n${log.stack_trace ?? 'none'}`,
      `Metadata: ${JSON.stringify(log.metadata ?? {})}`,
    ].join('\n');

    const result = await executeLLMRequest({
      prompt,
      systemInstruction,
      temperature: 0.2,
      maxTokens: 600,
    });

    await supabase
      .from('system_telemetry_logs')
      .update({ ai_diagnosis: result.text })
      .eq('id', logId);

    revalidatePath('/super-admin/observability');
    return { success: true, diagnosis: result.text };
  } catch (err) {
    const { message, stack } = normalizeError(err);
    await logTelemetry({
      severity: 'error',
      source: 'llm_router',
      endpoint: 'runAiDiagnosis',
      message,
      stackTrace: stack,
    });
    return { error: message };
  }
}

/**
 * Manually mark an error log as resolved (Auto-Resolve Tracker also flips this
 * to true when an Inngest retry succeeds or a health check passes).
 */
export async function resolveLog(logId: string, resolved = true) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const supabase = createServiceClient();
  const { error } = await supabase
    .from('system_telemetry_logs')
    .update({ is_resolved: resolved })
    .eq('id', logId);
  if (error) return { error: error.message };
  revalidatePath('/super-admin/observability');
  return { success: true };
}
