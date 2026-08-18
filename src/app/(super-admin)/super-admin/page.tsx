import { createServiceClient } from '@/lib/supabase/server';

export default async function SuperAdminPage() {
  const supabase = createServiceClient();

  // Fetch ALL tenants — using service client to bypass RLS
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-8 text-center text-rose-400 text-sm">
        Failed to load tenants: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">All Tenants</h2>
        <span className="text-xs text-gray-500 font-mono">{tenants?.length ?? 0} registered</span>
      </div>

      <div className="bg-[#0F1219] border border-gray-800 rounded-lg overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-800 bg-[#0B0E14]">
              <th className="text-left p-3 text-[9px] uppercase font-bold tracking-wider text-gray-500">Business</th>
              <th className="text-left p-3 text-[9px] uppercase font-bold tracking-wider text-gray-500">Plan</th>
              <th className="text-left p-3 text-[9px] uppercase font-bold tracking-wider text-gray-500">Status</th>
              <th className="text-left p-3 text-[9px] uppercase font-bold tracking-wider text-gray-500">Billing</th>
              <th className="text-right p-3 text-[9px] uppercase font-bold tracking-wider text-gray-500">Tokens Used</th>
              <th className="text-right p-3 text-[9px] uppercase font-bold tracking-wider text-gray-500">Messages</th>
              <th className="text-left p-3 text-[9px] uppercase font-bold tracking-wider text-gray-500">Setup</th>
              <th className="text-left p-3 text-[9px] uppercase font-bold tracking-wider text-gray-500">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/40">
            {(!tenants || tenants.length === 0) ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  No tenants registered yet.
                </td>
              </tr>
            ) : (
              tenants.map((t: any) => (
                <tr key={t.id} className="hover:bg-gray-900/40 transition">
                  <td className="p-3 text-white font-medium">{t.name}</td>
                  <td className="p-3">
                    <span className="px-1.5 py-0.5 bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 rounded text-[8px] font-bold uppercase">
                      {t.plan_type}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                      t.status === 'active'
                        ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                        : t.status === 'expired'
                        ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30'
                        : 'bg-rose-950/40 text-rose-400 border border-rose-900/30'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                      t.billing_provider === 'stripe'
                        ? 'bg-purple-950/40 text-purple-400 border border-purple-900/30'
                        : t.billing_provider === 'flutterwave'
                        ? 'bg-orange-950/40 text-orange-400 border border-orange-900/30'
                        : 'bg-gray-900 text-gray-500 border border-gray-800'
                    }`}>
                      {t.billing_provider ?? 'none'} {t.currency ? `(${t.currency})` : ''}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono text-gray-400">
                    {(t.token_usage ?? 0).toLocaleString()}
                  </td>
                  <td className="p-3 text-right font-mono text-gray-400">
                    {(t.message_usage ?? 0).toLocaleString()}
                  </td>
                  <td className="p-3">
                    {t.setup_fee_paid ? (
                      <span className="text-emerald-400 text-[8px] font-bold">PAID</span>
                    ) : (
                      <span className="text-gray-600 text-[8px] font-bold">NO</span>
                    )}
                  </td>
                  <td className="p-3 text-gray-500 font-mono">
                    {new Date(t.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
