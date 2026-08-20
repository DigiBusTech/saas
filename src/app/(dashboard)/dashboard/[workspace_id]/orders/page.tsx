'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { ShoppingCart, Filter, Check, X, Clock } from 'lucide-react';
import { getWorkspaceOrders, getOrderAnalytics } from './actions';
import { updateOrderStatus } from '../payments/actions';
import type { WorkspaceOrder, WorkspaceOrderStatus } from '@/lib/types/database';

const STATUS_LABELS: Record<WorkspaceOrderStatus, string> = {
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  paid: 'Paid',
  processing: 'Processing',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const STATUS_COLORS: Record<WorkspaceOrderStatus, string> = {
  pending_review: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  processing: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  shipped: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  completed: 'bg-emerald-600/10 text-emerald-300 border-emerald-600/20',
  cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

export default function OrdersPage() {
  const params = useParams<{ workspace_id: string }>();
  const workspaceId = params.workspace_id;
  const [orders, setOrders] = useState<(WorkspaceOrder & { workspace_order_items: any[] })[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [filter, setFilter] = useState<WorkspaceOrderStatus | 'all'>('all');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getWorkspaceOrders(workspaceId, filter === 'all' ? undefined : filter).then((r) => setOrders(r.data));
    getOrderAnalytics(workspaceId).then(setAnalytics);
  }, [workspaceId, filter]);

  function updateStatus(orderId: string, newStatus: WorkspaceOrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, newStatus);
      if (!result.error) {
        setOrders((items) => items.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
      }
    });
  }

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-indigo-400" /><h1 className="text-xl font-semibold text-white">Orders</h1></div>
        <p className="mt-1 text-xs text-gray-500">Manage customer orders, update status, and track fulfillment across all channels.</p>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Total Orders', value: analytics.totalOrders, color: 'from-indigo-500 to-purple-600' },
            { label: 'Total Revenue', value: `$${(analytics.totalRevenue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'from-emerald-500 to-teal-600' },
            { label: 'Completed', value: analytics.byStatus?.completed || 0, color: 'from-blue-500 to-cyan-600' },
            { label: 'Processing', value: analytics.byStatus?.processing || 0, color: 'from-orange-500 to-yellow-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl bg-linear-to-br ${color} p-4 text-white shadow-lg`}>
              <p className="text-[10px] uppercase tracking-wider opacity-75">{label}</p>
              <p className="mt-2 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-500" />
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending_review', 'processing', 'completed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`text-xs px-3 py-1 rounded-lg transition ${
                filter === status
                  ? 'bg-indigo-500 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {status === 'all' ? 'All Orders' : STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border border-white/10 bg-zinc-900/50 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="border-b border-white/5 bg-zinc-800/50">
            <tr>
              {['Order Code', 'Customer', 'Items', 'Total', 'Channel', 'Status', 'Action'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-gray-400 font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No orders found.</td></tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-t border-white/5 hover:bg-white/5 transition">
                  <td className="px-4 py-3 font-mono text-gray-300">{order.order_code || order.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-gray-400">{order.customer_name}</td>
                  <td className="px-4 py-3 text-gray-500">{order.workspace_order_items?.length || 0} item(s)</td>
                  <td className="px-4 py-3 font-bold text-white">{order.currency} {order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 capitalize text-gray-400">{order.channel || 'web'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] px-2 py-1 rounded-full border ${STATUS_COLORS[order.status as WorkspaceOrderStatus] || 'bg-gray-500/10 text-gray-400'}`}>
                      {STATUS_LABELS[order.status as WorkspaceOrderStatus] || order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order.id, e.target.value as WorkspaceOrderStatus)}
                      disabled={pending}
                      className="bg-zinc-800/50 border border-white/10 text-white text-xs rounded px-2 py-1 outline-none cursor-pointer"
                    >
                      {(Object.keys(STATUS_LABELS) as WorkspaceOrderStatus[]).map((s) => (
                        <option key={s} value={s} className="bg-zinc-900">{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
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
