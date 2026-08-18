'use client';

import { useEffect, useState, useTransition, useCallback, Fragment } from 'react';

import { createClient } from '@/lib/supabase/client';
import { runAiDiagnosis, resolveLog, getHealthOverview, type TelemetryLog, type HealthOverview } from './actions';

interface Props {
  initialLogs: TelemetryLog[];
  initialOverview: HealthOverview;
}

const SEVERITY_STYLES: Record<string, { badge: string; label: string }> = {
  critical: { badge: 'bg-rose-950/60 text-rose-300 border-rose-800/50', label: 'CRITICAL' },
  error: { badge: 'bg-rose-950/40 text-rose-400 border-rose-900/40', label: 'ERROR' },
  warning: { badge: 'bg-amber-950/40 text-amber-400 border-amber-900/40', label: 'WARNING' },
  info: { badge: 'bg-sky-950/40 text-sky-400 border-sky-900/40', label: 'INFO' },
};

function sourceLabel(source: string): string {
  if (source.startsWith('webhook')) return 'Webhook';
  if (source.includes('llm') || source.includes('router')) return 'LLM';
  if (source.includes('vector') || source.includes('embed')) return 'Vector';
  if (source.includes('inngest')) return 'Inngest';
  return source;
}

export function ObservabilityClient({ initialLogs, initialOverview }: Props) {
  const [logs, setLogs] = useState<TelemetryLog[]>(initialLogs);
  const [overview, setOverview] = useState<HealthOverview>(initialOverview);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [diagnosing, setDiagnosing] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [actionError, setActionError] = useState<string | null>(null);

  const refreshOverview = useCallback(() => {
    getHealthOverview().then(setOverview).catch(() => {});
  }, []);

  // Realtime subscription to system_telemetry_logs
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel('telemetry-stream')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'system_telemetry_logs' },
        (payload) => {
          setLogs((prev) => [payload.new as TelemetryLog, ...prev].slice(0, 200));
          refreshOverview();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'system_telemetry_logs' },
        (payload) => {
          const updated = payload.new as TelemetryLog;
          setLogs((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
          refreshOverview();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshOverview]);

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleDiagnose(id: string) {
    setDiagnosing(id);
    setActionError(null);
    startTransition(async () => {
      const result = await runAiDiagnosis(id);
      if (result.error) setActionError(result.error);
      setExpanded((prev) => ({ ...prev, [id]: true }));
      setDiagnosing(null);
    });
  }

  function handleResolve(id: string, resolved: boolean) {
    setActionError(null);
    startTransition(async () => {
      const result = await resolveLog(id, resolved);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, is_resolved: resolved } : l)));
      refreshOverview();
    });
  }

  const filtered = severityFilter === 'all' ? logs : logs.filter((l) => l.severity === severityFilter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Infrastructure & Error Monitor</h1>
        <p className="text-xs text-gray-500 mt-1">
          Real-time telemetry stream from webhooks, the LLM router, and background jobs.
        </p>
      </div>

      {actionError && (
        <div className="rounded-lg border border-rose-900/50 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">
          {actionError}
        </div>
      )}

      {/* Health Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total API Calls (24h)" value={overview.totalApiCalls24h.toLocaleString()} accent="text-indigo-400" />
        <StatCard
          label="Webhook Success Rate"
          value={`${overview.webhookSuccessRate}%`}
          accent={overview.webhookSuccessRate >= 95 ? 'text-emerald-400' : 'text-amber-400'}
        />
        <StatCard label="Active Warnings" value={overview.activeWarnings.toLocaleString()} accent="text-amber-400" />
        <StatCard label="Unresolved Errors" value={overview.unresolvedErrors.toLocaleString()} accent="text-rose-400" />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500">Filter:</span>
        {['all', 'critical', 'error', 'warning', 'info'].map((s) => (
          <button
            key={s}
            onClick={() => setSeverityFilter(s)}
            className={`px-2.5 py-1 rounded border transition capitalize ${
              severityFilter === s
                ? 'bg-indigo-950/50 text-indigo-300 border-indigo-800/50'
                : 'text-gray-500 border-gray-800 hover:text-gray-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Log Stream Table */}
      <div className="border border-gray-800 rounded-lg overflow-hidden bg-[#0B0E14]">
        <table className="w-full text-xs">
          <thead className="bg-gray-900/60 text-gray-500 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Severity</th>
              <th className="text-left px-3 py-2 font-medium">Source</th>
              <th className="text-left px-3 py-2 font-medium">Endpoint</th>
              <th className="text-left px-3 py-2 font-medium">Message</th>
              <th className="text-left px-3 py-2 font-medium">Time</th>
              <th className="text-right px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-gray-600">
                  No telemetry logs yet. Errors and warnings will stream here in real time.
                </td>
              </tr>
            )}
            {filtered.map((log) => {
              const sev = SEVERITY_STYLES[log.severity] ?? SEVERITY_STYLES.info;
              const isOpen = expanded[log.id];
              return (
                <Fragment key={log.id}>
                  <tr className={log.is_resolved ? 'opacity-50' : ''}>

                    <td className="px-3 py-2 align-top">
                      <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold ${sev.badge}`}>
                        {sev.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 align-top text-gray-400">{sourceLabel(log.source)}</td>
                    <td className="px-3 py-2 align-top text-gray-500 font-mono max-w-[140px] truncate">
                      {log.endpoint ?? '—'}
                    </td>
                    <td className="px-3 py-2 align-top text-gray-300 max-w-md">
                      <div className="truncate">{log.message}</div>
                      {(log.stack_trace || log.ai_diagnosis) && (
                        <button
                          onClick={() => toggle(log.id)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 mt-1"
                        >
                          {isOpen ? '▲ Hide details' : '▼ Show details'}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-gray-600 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 align-top text-right whitespace-nowrap space-x-1">
                      <button
                        onClick={() => handleDiagnose(log.id)}
                        disabled={diagnosing === log.id}
                        className="px-2 py-1 rounded bg-indigo-950/50 text-indigo-300 border border-indigo-800/50 hover:bg-indigo-900/50 transition text-[10px] disabled:opacity-50"
                      >
                        {diagnosing === log.id ? 'Analyzing…' : 'Run AI Diagnosis'}
                      </button>
                      <button
                        onClick={() => handleResolve(log.id, !log.is_resolved)}
                        className="px-2 py-1 rounded border border-gray-800 text-gray-400 hover:text-white transition text-[10px]"
                      >
                        {log.is_resolved ? 'Reopen' : 'Resolve'}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>

                      <td colSpan={6} className="px-3 py-3 bg-gray-950/60">
                        {log.ai_diagnosis && (
                          <div className="mb-3">
                            <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-semibold mb-1">
                              AI Diagnosis
                            </p>
                            <pre className="text-[11px] text-emerald-200/90 whitespace-pre-wrap font-sans bg-emerald-950/20 border border-emerald-900/30 rounded p-2">
                              {log.ai_diagnosis}
                            </pre>
                          </div>
                        )}
                        {log.stack_trace && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
                              Stack Trace
                            </p>
                            <pre className="text-[10px] text-gray-400 whitespace-pre-wrap font-mono bg-black/40 border border-gray-800 rounded p-2 max-h-64 overflow-auto">
                              {log.stack_trace}
                            </pre>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );

            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="border border-gray-800 rounded-lg p-4 bg-[#0B0E14]">
      <p className="text-[10px] uppercase tracking-wider text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent}`}>{value}</p>
    </div>
  );
}
