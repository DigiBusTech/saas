'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { WorkspaceOrder, WorkspaceOrderStatus } from '@/lib/types/database';

export async function getWorkspaceOrders(workspaceId: string, status?: WorkspaceOrderStatus) {
  const db = await createClient();
  let query = db
    .from('workspace_orders')
    .select('*, workspace_order_items(title, quantity, unit_price, currency)')
    .eq('workspace_id', workspaceId);
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false });
  return { data: data as (WorkspaceOrder & { workspace_order_items: any[] })[] ?? [], error: error?.message ?? null };
}

export async function getOrderAnalytics(workspaceId: string) {
  const db = await createClient();
  const { data: orders } = await db
    .from('workspace_orders')
    .select('status, total, currency, created_at, channel')
    .eq('workspace_id', workspaceId);

  if (!orders) return { totalOrders: 0, totalRevenue: 0, byStatus: {}, byChannel: {}, avgFulfillment: 0 };

  const byStatus: Record<string, number> = {};
  let totalRevenue = 0;
  const byChannel: Record<string, number> = {};
  const fulfillmentTimes: number[] = [];

  for (const order of orders) {
    byStatus[order.status ?? 'unknown'] = (byStatus[order.status ?? 'unknown'] || 0) + 1;
    if (order.status === 'paid' || order.status === 'completed') totalRevenue += order.total ?? 0;
    byChannel[order.channel ?? 'web'] = (byChannel[order.channel ?? 'web'] || 0) + 1;
  }

  return {
    totalOrders: orders.length,
    totalRevenue,
    byStatus,
    byChannel,
    avgFulfillment: fulfillmentTimes.length > 0 ? Math.round(fulfillmentTimes.reduce((a, b) => a + b, 0) / fulfillmentTimes.length) : 0,
  };
}
