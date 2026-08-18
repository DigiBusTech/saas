"use client";

interface Stats {
  tenants: number;
  activeTenants: number;
  workspaces: number;
  conversations: number;
  messages24h: number;
  mrrUsd: number;
  planBreakdown: { plan: string; count: number }[];
}

interface Props {
  stats: Stats;
}

export function AnalyticsClient({ stats }: Props) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Est. MRR" value={`$${stats.mrrUsd.toLocaleString()}`} accent="text-emerald-400" />
        <StatCard label="Active Tenants" value={`${stats.activeTenants} / ${stats.tenants}`} accent="text-indigo-400" />
        <StatCard label="Workspaces" value={stats.workspaces.toString()} accent="text-sky-400" />
        <StatCard label="Messages (24h)" value={stats.messages24h.toLocaleString()} accent="text-amber-400" />
      </div>

      <div className="border border-gray-800 rounded-lg bg-[#0B0E14] p-5">
        <h2 className="text-sm font-bold text-white mb-4">Plan Distribution</h2>
        {stats.planBreakdown.length === 0 ? (
          <p className="text-xs text-gray-500">No tenants yet.</p>
        ) : (
          <div className="space-y-2">
            {stats.planBreakdown.map((p) => {
              const pct = stats.tenants > 0 ? Math.round((p.count / stats.tenants) * 100) : 0;
              return (
                <div key={p.plan} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-24 capitalize shrink-0">{p.plan}</span>
                  <div className="flex-1 h-2 rounded-full bg-gray-900 overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right shrink-0">{p.count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border border-gray-800 rounded-lg bg-[#0B0E14] p-5">
        <h2 className="text-sm font-bold text-white mb-2">Total Conversations</h2>
        <p className="text-2xl font-bold text-white">{stats.conversations.toLocaleString()}</p>
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

