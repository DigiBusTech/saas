'use client';

import { useEffect, useState, useTransition } from 'react';
import { useParams } from 'next/navigation';
import { ShoppingCart, Filter, Check, X, Clock, Package, Calendar } from 'lucide-react';
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

const SERVICE_STATUS_LABELS: Record<string, string> = {
  inquiry: 'Inquiry',
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const SERVICE_STATUS_COLORS: Record<string, string> = {
  inquiry: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  scheduled: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  in_progress: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  cancelled: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
};

type OrderTypeFilter = 'all' | 'product' | 'service';

export default function OrdersPage() {
  const params = useParams<{ workspace_id: string }>();
  const workspaceId = params.workspace_id;
  const [orders, setOrders] = useState<(WorkspaceOrder & { workspace_order_items: any[] })[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<WorkspaceOrderStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>('all');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    getWorkspaceOrders(workspaceId, statusFilter === 'all' ? undefined : statusFilter).then((r) => setOrders(r.data));
    getOrderAnalytics(workspaceId).then(setAnalytics);
  }, [workspaceId, statusFilter]);

  function updateStatus(orderId: string, newStatus: WorkspaceOrderStatus) {
    startTransition(async () => {
      const result = await updateOrderStatus(orderId, newStatus);
      if (!result.error) {
        setOrders((items) => items.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
      }
    });
  }

  const filteredOrders = typeFilter === 'all' 
    ? orders 
    : orders.filter(o => (o as any).order_type === typeFilter);

  const productCount = orders.filter(o => (o as any).order_type !== 'service').length;
  const serviceCount = orders.filter(o => (o as any).order_type === 'service').length;

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-indigo-500 dark:text-indigo-400" /><h1 className="text-xl font-semibold text-foreground">Orders & Bookings</h1></div>
        <p className="mt-1 text-xs text-muted-foreground">Manage customer orders, service bookings, update status, and track fulfillment across all channels.</p>
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

      {/* PHASE 3: Order Type Filter (Product Sales vs Service Bookings) */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Type:</span>
          <div className="flex gap-2">
            {[
              { value: 'all' as OrderTypeFilter, label: 'All Orders', icon: ShoppingCart, count: orders.length },
              { value: 'product' as OrderTypeFilter, label: 'Product Sales', icon: Package, count: productCount },
              { value: 'service' as OrderTypeFilter, label: 'Service Bookings', icon: Calendar, count: serviceCount },
            ].map(({ value, label, icon: Icon, count }) => (
              <button
                key={value}
                onClick={() => setTypeFilter(value)}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition ${
                  typeFilter === value
                    ? 'bg-indigo-500 text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <span className="ml-1 text-[10px] opacity-70">({count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Status:</span>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending_review', 'processing', 'completed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`text-xs px-3 py-1 rounded-lg transition ${
                statusFilter === status
                  ? 'bg-purple-500 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {status === 'all' ? 'All Statuses' : STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              {['Type', 'Order Code', 'Customer', 'Items', 'Total', 'Channel', 'Status', typeFilter === 'service' ? 'Service Date' : 'Action'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-muted-foreground font-semibold uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No orders found.</td></tr>
            ) : (
              filteredOrders.map((order) => {
                const orderType = (order as any).order_type || 'product';
                const isService = orderType === 'service';
                return (
                  <tr key={order.id} className="border-t border-border hover:bg-muted/50 transition">
                    <td className="px-4 py-3">
                      {isService ? (
                        <span className="flex items-center gap-1 text-purple-400"><Calendar className="h-3.5 w-3.5" /> Service</span>
                      ) : (
                        <span className="flex items-center gap-1 text-indigo-400"><Package className="h-3.5 w-3.5" /> Product</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-foreground/80">{order.order_code || order.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{order.customer_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{order.workspace_order_items?.length || 0} item(s)</td>
                    <td className="px-4 py-3 font-bold text-foreground">{order.currency} {order.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{order.channel || 'web'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`text-[9px] px-2 py-1 rounded-full border ${STATUS_COLORS[order.status as WorkspaceOrderStatus] || 'bg-muted text-muted-foreground'}`}>
                          {STATUS_LABELS[order.status as WorkspaceOrderStatus] || order.status}
                        </span>
                        {isService && (order as any).service_status && (
                          <span className={`text-[9px] px-2 py-1 rounded-full border ${SERVICE_STATUS_COLORS[(order as any).service_status] || 'bg-muted text-muted-foreground'}`}>
                            {SERVICE_STATUS_LABELS[(order as any).service_status] || (order as any).service_status}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isService && (order as any).service_date ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-foreground font-medium">
                            {new Date((order as any).service_date).toLocaleDateString()}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date((order as any).service_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {(order as any).booking_notes && (
                            <span className="text-[10px] text-muted-foreground italic">
                              Note: {(order as any).booking_notes.substring(0, 40)}...
                            </span>
                          )}
                        </div>
                      ) : (
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value as WorkspaceOrderStatus)}
                          disabled={pending}
                          className="bg-muted border border-input text-foreground text-xs rounded px-2 py-1 outline-none cursor-pointer"
                        >
                          {(Object.keys(STATUS_LABELS) as WorkspaceOrderStatus[]).map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
