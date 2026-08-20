'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { inngest } from '@/inngest/client';

export async function getPaymentOptions(workspaceId: string) {
  const db = await createClient();
  const { data } = await db.from('workspaces').select('payment_options').eq('id', workspaceId).single();
  const options = (data?.payment_options ?? { methods: [], checkout_fields: [] }) as Record<string, unknown>;
  return { methods: Array.isArray(options.methods) ? options.methods : [], checkout_fields: Array.isArray(options.checkout_fields) ? options.checkout_fields : [] };
}

export async function savePaymentOptions(workspaceId: string, formData: FormData) {
  const methods = JSON.parse(String(formData.get('methods') ?? '[]'));
  const checkoutFields = JSON.parse(String(formData.get('checkout_fields') ?? '[]'));
  const db = await createClient();
  const { error } = await db.from('workspaces').update({ payment_options: { methods, checkout_fields: checkoutFields } }).eq('id', workspaceId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/${workspaceId}/payments`);
  return { error: null };
}

export async function getWorkspaceOrders(workspaceId: string) {
  const db = await createClient();
  const { data, error } = await db.from('workspace_orders').select('*, workspace_order_items(*)').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
  return { data: data ?? [], error: error?.message ?? null };
}

export async function reviewOrder(orderId: string, status: 'approved' | 'rejected') {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: 'Unauthorized' };
  const { error } = await db.from('workspace_orders').update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user.id }).eq('id', orderId);
  if (!error) await inngest.send({ name: 'order/status.updated', data: { orderId, newStatus: status } }).catch(() => {});
  return { error: error?.message ?? null };
}

// General-purpose status update for the full order lifecycle (used by the
// Order Manager panel), separate from the checkout approve/reject flow above.
export async function updateOrderStatus(
  orderId: string,
  status: 'pending_review' | 'approved' | 'rejected' | 'paid' | 'processing' | 'shipped' | 'completed' | 'cancelled'
) {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: 'Unauthorized' };
  const { error } = await db.from('workspace_orders').update({ status }).eq('id', orderId);
  if (error) return { error: error.message };
  await inngest.send({ name: 'order/status.updated', data: { orderId, newStatus: status } }).catch(() => {});
  return { error: null };
}
