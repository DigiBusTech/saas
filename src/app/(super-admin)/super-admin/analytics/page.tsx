import { getAnalyticsStats } from './actions';
import { AnalyticsClient } from './analytics-client';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const { stats, error } = await getAnalyticsStats();
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-white mb-4">Platform Analytics</h1>
      {error && (
        <div className="p-3 mb-4 bg-rose-950/30 border border-rose-500/30 text-rose-300 rounded text-xs">
          Failed to load analytics: {error}
        </div>
      )}
      <AnalyticsClient stats={stats} />
    </div>
  );
}