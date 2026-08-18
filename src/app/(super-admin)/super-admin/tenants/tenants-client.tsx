'use client';

import { useState, useTransition } from 'react';
import { updateTenant, suspendTenant } from './actions';
import { exportTenantData } from './data-export-actions';

interface Tenant {
  id: string;
  name: string;
  status: string;
  plan_type: string;
  plan_id: string | null;
  is_suspended: boolean;
  message_usage: number;
  token_usage: number;
  created_at: string;
  workspace_count: number;
  owner_email: string;
  owner_name: string;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  max_workspaces: number;
}

interface Props {
  tenants: Tenant[];
  plans: Plan[];
}

export function TenantsClient({ tenants, plans }: Props) {
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const filtered = tenants.filter(
    (t) =>
      t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.owner_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  async function handleUpdate(formData: FormData) {
    setMessage(null);
    const result = await updateTenant(formData);
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'Tenant updated successfully' });
      setEditingTenant(null);
    }
  }

  function handleSuspend(tenantId: string, suspend: boolean) {
    const action = suspend ? 'suspend' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} this tenant?`)) return;
    startTransition(async () => {
      const result = await suspendTenant(tenantId, suspend);
      if (result.error) setMessage({ type: 'error', text: result.error });
      else setMessage({ type: 'success', text: `Tenant ${action}d successfully` });
    });
  }

  function handleExport(tenantId: string, tenantName: string) {
    startTransition(async () => {
      const result = await exportTenantData(tenantId);
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
        return;
      }
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${tenantName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-data-export.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Tenant data export downloaded.' });
    });
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Tenant Management</h1>
          <p className="text-xs text-gray-500 mt-1">
            Manage all registered tenants — override plans, usage, and suspension status.
          </p>
        </div>
        <div className="text-[10px] px-3 py-1.5 bg-indigo-950/40 border border-indigo-900/30 rounded-full text-indigo-400 font-bold">
          {tenants.length} Tenants
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or email..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full max-w-sm px-3 py-2 bg-[#0B0E14] border border-gray-800 rounded text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
      />

      {message && (
        <div className={`p-3 rounded text-xs ${message.type === 'success' ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-300' : 'bg-rose-950/30 border border-rose-500/30 text-rose-300'}`}>
          {message.text}
        </div>
      )}

      {/* Data Table */}
      <div className="bg-[#0F1219] border border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 uppercase text-[9px] tracking-wider">
                <th className="text-left px-4 py-3">Tenant</th>
                <th className="text-left px-4 py-3">Owner Email</th>
                <th className="text-left px-4 py-3">Plan</th>
                <th className="text-center px-4 py-3">Workspaces</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tenant) => (
                <tr key={tenant.id} className="border-b border-gray-800/50 hover:bg-white/[0.02] transition">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium">{tenant.name}</p>
                    <p className="text-[9px] text-gray-600 mt-0.5 font-mono">{tenant.id.slice(0, 8)}...</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{tenant.owner_email}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 rounded text-[9px] font-bold uppercase">
                      {tenant.plan_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-300">{tenant.workspace_count}</td>
                  <td className="px-4 py-3 text-center">
                    {tenant.is_suspended ? (
                      <span className="px-2 py-0.5 bg-rose-950/40 text-rose-400 border border-rose-900/30 rounded text-[9px] font-bold uppercase">
                        Suspended
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded text-[9px] font-bold uppercase">
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingTenant(tenant)}
                        className="text-[10px] px-2.5 py-1 bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 rounded hover:bg-indigo-600/30 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleExport(tenant.id, tenant.name)}
                        disabled={isPending}
                        className="text-[10px] px-2.5 py-1 bg-sky-600/20 text-sky-400 border border-sky-600/30 rounded hover:bg-sky-600/30 transition disabled:opacity-50"
                      >
                        Export
                      </button>
                      {tenant.is_suspended ? (
                        <button
                          onClick={() => handleSuspend(tenant.id, false)}
                          disabled={isPending}
                          className="text-[10px] px-2.5 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded hover:bg-emerald-600/30 transition disabled:opacity-50"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSuspend(tenant.id, true)}
                          disabled={isPending}
                          className="text-[10px] px-2.5 py-1 bg-rose-600/20 text-rose-400 border border-rose-600/30 rounded hover:bg-rose-600/30 transition disabled:opacity-50"
                        >
                          Suspend
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-600">
                    No tenants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Tenant Modal */}
      {editingTenant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F1219] border border-gray-800 rounded-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Edit Tenant: {editingTenant.name}</h3>
              <button onClick={() => setEditingTenant(null)} className="text-gray-500 hover:text-white text-lg">×</button>
            </div>

            <form action={handleUpdate} className="space-y-4">
              <input type="hidden" name="id" value={editingTenant.id} />

              {/* Plan Override */}
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">Manual Plan Override</label>
                <select
                  name="plan_id"
                  defaultValue={editingTenant.plan_id ?? ''}
                  className="w-full bg-[#0B0E14] border border-gray-800 rounded px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                >
                  <option value="">— No Change —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.max_workspaces} workspaces)
                    </option>
                  ))}
                </select>
              </div>

              {/* Usage Controls */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">Message Usage</label>
                  <input
                    name="message_usage"
                    type="number"
                    defaultValue={editingTenant.message_usage}
                    min={0}
                    className="w-full bg-[#0B0E14] border border-gray-800 rounded px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">Token Usage</label>
                  <input
                    name="token_usage"
                    type="number"
                    defaultValue={editingTenant.token_usage}
                    min={0}
                    className="w-full bg-[#0B0E14] border border-gray-800 rounded px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="bg-[#0B0E14] border border-gray-800 rounded p-3">
                <p className="text-[9px] text-gray-500">
                  <strong className="text-gray-400">Tip:</strong> Set usage counters to 0 to reset the tenant&apos;s monthly consumption. Change plan to override their subscription tier.
                </p>
              </div>

              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setEditingTenant(null)} className="text-xs px-3 py-1.5 bg-gray-800 rounded text-gray-400 hover:text-white transition">
                  Cancel
                </button>
                <button type="submit" className="text-xs px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-white font-bold transition">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
