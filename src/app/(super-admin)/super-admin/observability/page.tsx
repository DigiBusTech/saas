import { getHealthOverview, getTelemetryLogs } from './actions';
import { ObservabilityClient } from './observability-client';

export const dynamic = 'force-dynamic';

export default async function ObservabilityPage() {
  const [overview, { logs, error }] = await Promise.all([
    getHealthOverview(),
    getTelemetryLogs(200),
  ]);

  return (
    <div className="p-6">
      {error && (
        <div className="mb-4 p-3 rounded text-xs bg-rose-950/30 border border-rose-500/30 text-rose-300">
          Failed to load telemetry logs: {error}
        </div>
      )}
      <ObservabilityClient initialLogs={logs} initialOverview={overview} />
    </div>
  );
}
