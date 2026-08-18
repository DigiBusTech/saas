'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getWorkspaceServices(workspaceId: string) {
  const db = await createClient();
  const { data, error } = await db.from('workspace_services').select('*').eq('workspace_id', workspaceId).order('created_at', { ascending: false });
  return { data: data ?? [], error: error?.message ?? null };
}

export async function createService(workspaceId: string, formData: FormData) {
  const db = await createClient();
  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'Service name is required' };
  const { error } = await db.from('workspace_services').insert({ workspace_id: workspaceId, name, description: String(formData.get('description') ?? '') || null, price: Number(formData.get('price')) || null, currency: String(formData.get('currency') ?? 'USD'), image_url: String(formData.get('image_url') ?? '') || null, payment_link: String(formData.get('payment_link') ?? '') || null });
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/${workspaceId}/services`);
  return { error: null };
}

export async function deleteService(workspaceId: string, serviceId: string) {
  const db = await createClient();
  const { error } = await db.from('workspace_services').delete().eq('workspace_id', workspaceId).eq('id', serviceId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/${workspaceId}/services`);
  return { error: null };
}
