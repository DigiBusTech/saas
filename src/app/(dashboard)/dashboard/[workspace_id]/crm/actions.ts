'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ---------- READ ----------

export async function getWorkspaceCRM(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workspace_crm')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('last_interaction', { ascending: false });

  return { data: data ?? [], error: error?.message ?? null };
}

export async function getCRMMetrics(workspaceId: string) {
  const supabase = await createClient();
  const { data: leads } = await supabase
    .from('workspace_crm')
    .select('id, lead_score, tags, category, subscription_status, subscription_expiry')
    .eq('workspace_id', workspaceId);

  const all = leads ?? [];
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    totalLeads: all.length,
    highTicket: all.filter((l) => l.tags?.includes('High Ticket')).length,
    subscribed: all.filter((l) => l.subscription_status === 'subscriber').length,
    expiringSoon: all.filter((l) =>
      l.subscription_expiry && new Date(l.subscription_expiry) <= sevenDays && new Date(l.subscription_expiry) > now
    ).length,
  };
}

export async function getWorkspaceCategories(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('workspace_categories')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name');
  return data ?? [];
}

// ---------- CREATE (Manual Entry) ----------

export async function createCRMLead(workspaceId: string, formData: FormData) {
  const name = formData.get('customer_name') as string;
  const platform = formData.get('platform') as string;
  const platformId = (formData.get('platform_user_id') as string)?.trim();
  const phoneNumber = (formData.get('phone_number') as string)?.trim();
  const category = (formData.get('category') as string) || null;
  const leadScore = parseInt(formData.get('lead_score') as string) || 10;

  if (!platformId) return { error: 'Platform ID / Phone Number is required' };

  const supabase = await createClient();
  const { error } = await supabase.from('workspace_crm').insert({
    workspace_id: workspaceId,
    platform: platform as 'whatsapp' | 'telegram',
    platform_user_id: platformId,
    customer_name: name || null,
    phone_number: platform === 'whatsapp' ? (phoneNumber || platformId) : null,
    category,
    lead_score: leadScore,
    tags: ['Manual Entry'],
    subscription_status: 'lead',
    last_interaction: new Date().toISOString(),
  });

  if (error) {
    if (error.code === '23505') return { error: 'A lead with this ID already exists in this workspace' };
    return { error: error.message };
  }

  revalidatePath(`/dashboard/${workspaceId}/crm`);
  return { error: null };
}

// ---------- UPDATE (Quick Edit) ----------

export async function updateCRMRecord(recordId: string, workspaceId: string, formData: FormData) {
  const supabase = await createClient();
  const update: Record<string, any> = {};

  const customerName = formData.get('customer_name') as string;
  if (customerName !== null) update.customer_name = customerName || null;

  const phoneNumber = formData.get('phone_number') as string;
  if (phoneNumber !== null) update.phone_number = phoneNumber || null;

  const category = formData.get('category') as string;
  if (category !== undefined) update.category = category || null;

  const leadScore = parseInt(formData.get('lead_score') as string);
  if (!isNaN(leadScore)) update.lead_score = leadScore;

  const tags = (formData.get('tags') as string)?.split(',').map((t) => t.trim()).filter(Boolean) ?? [];
  if (tags.length > 0) update.tags = tags;

  const subscriptionStatus = formData.get('subscription_status') as string;
  if (subscriptionStatus) update.subscription_status = subscriptionStatus;

  const subscriptionExpiry = formData.get('subscription_expiry') as string;
  if (subscriptionExpiry) update.subscription_expiry = subscriptionExpiry;
  else if (formData.has('subscription_expiry')) update.subscription_expiry = null;

  if (Object.keys(update).length === 0) return { error: 'No changes' };

  const { error } = await supabase
    .from('workspace_crm')
    .update(update)
    .eq('id', recordId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/${workspaceId}/crm`);
  return { error: null };
}

// ---------- DELETE ----------

export async function deleteCRMRecord(recordId: string, workspaceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('workspace_crm')
    .delete()
    .eq('id', recordId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/${workspaceId}/crm`);
  return { error: null };
}

// ---------- WhatsApp CSV Bulk Upsert ----------

interface CSVContact {
  name: string;
  phone_number: string;
  category: string;
}

export async function bulkUpsertWhatsAppContacts(workspaceId: string, contacts: CSVContact[]) {
  if (!contacts || contacts.length === 0) return { error: 'No contacts to import', imported: 0 };

  const supabase = await createClient();
  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Process in batches of 50
  const batchSize = 50;
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = contacts.slice(i, i + batchSize);

    const rows = batch
      .filter((c) => c.phone_number?.trim())
      .map((c) => ({
        workspace_id: workspaceId,
        platform: 'whatsapp' as const,
        platform_user_id: c.phone_number.trim(),
        phone_number: c.phone_number.trim(),
        customer_name: c.name?.trim() || null,
        category: c.category?.trim() || null,
        lead_score: 10,
        tags: ['CSV Import'],
        subscription_status: 'lead' as const,
        last_interaction: new Date().toISOString(),
      }));

    if (rows.length === 0) continue;

    const { error } = await supabase
      .from('workspace_crm')
      .upsert(rows, {
        onConflict: 'workspace_id,platform,platform_user_id',
        ignoreDuplicates: false,
      });

    if (error) {
      errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
      skipped += rows.length;
    } else {
      imported += rows.length;
    }
  }

  revalidatePath(`/dashboard/${workspaceId}/crm`);

  if (errors.length > 0) {
    return { error: errors.join('; '), imported, skipped };
  }

  return { error: null, imported, skipped };
}
