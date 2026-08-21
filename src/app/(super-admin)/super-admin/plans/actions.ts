'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';

export async function getPlans() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('sort_order');

  if (error) return { plans: [], error: error.message };
  return { plans: data ?? [], error: null };
}

export async function createPlan(formData: FormData) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const price_usd = parseInt(formData.get('price_usd') as string, 10) || 0;
  const price_ngn = parseInt(formData.get('price_ngn') as string, 10) || 0;
  // PHASE 4: Monthly/Annual pricing
  const price_monthly_usd = parseInt(formData.get('price_monthly_usd') as string, 10) || price_usd;
  const price_annual_usd = parseInt(formData.get('price_annual_usd') as string, 10) || price_usd * 10;
  const price_monthly_ngn = parseInt(formData.get('price_monthly_ngn') as string, 10) || price_ngn;
  const price_annual_ngn = parseInt(formData.get('price_annual_ngn') as string, 10) || price_ngn * 10;
  const annual_discount_percentage = parseFloat(formData.get('annual_discount_percentage') as string) || 16.67;
  const allow_telegram = formData.get('allow_telegram') === 'true';
  const allow_whatsapp = formData.get('allow_whatsapp') === 'true';
  const telegram_message_limit = parseInt(formData.get('telegram_message_limit') as string, 10) || 100;
  const whatsapp_message_limit = parseInt(formData.get('whatsapp_message_limit') as string, 10) || 100;
  const monthly_token_limit = parseInt(formData.get('monthly_token_limit') as string, 10) || 100000;
  const max_workspaces = parseInt(formData.get('max_workspaces') as string, 10) || 1;
  const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0;
  
  // NEW PHASE 3 FIELDS
  const ai_message_cap = parseInt(formData.get('ai_message_cap') as string, 10) || 200;
  const knowledge_doc_cap = parseInt(formData.get('knowledge_doc_cap') as string, 10) || 10;
  const crm_lead_cap = parseInt(formData.get('crm_lead_cap') as string, 10) || 50;
  const has_whatsapp = formData.get('has_whatsapp') === 'true';
  const has_telegram = formData.get('has_telegram') === 'true';
  const is_enterprise_contact_sales = formData.get('is_enterprise_contact_sales') === 'true';

  let features: Record<string, boolean> = {};
  try {
    features = JSON.parse(formData.get('features') as string || '{}');
  } catch {
    return { error: 'Invalid features JSON' };
  }

  if (!name || !slug) return { error: 'Name and slug are required' };

  const supabase = createServiceClient();

  const { error } = await supabase.from('subscription_plans').insert({
    name,
    slug,
    price_usd,
    price_ngn,
    price_monthly_usd,
    price_annual_usd,
    price_monthly_ngn,
    price_annual_ngn,
    annual_discount_percentage,
    features,
    allow_telegram,
    allow_whatsapp,
    telegram_message_limit,
    whatsapp_message_limit,
    monthly_token_limit,
    max_workspaces,
    sort_order,
    // NEW PHASE 3 FIELDS
    ai_message_cap,
    knowledge_doc_cap,
    crm_lead_cap,
    has_whatsapp,
    has_telegram,
    is_enterprise_contact_sales,
  });

  if (error) return { error: error.message };

  revalidatePath('/super-admin/plans');
  return { error: null };
}

export async function updatePlan(formData: FormData) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  const price_usd = parseInt(formData.get('price_usd') as string, 10) || 0;
  const price_ngn = parseInt(formData.get('price_ngn') as string, 10) || 0;
  // PHASE 4: Monthly/Annual pricing
  const price_monthly_usd = parseInt(formData.get('price_monthly_usd') as string, 10) || price_usd;
  const price_annual_usd = parseInt(formData.get('price_annual_usd') as string, 10) || price_usd * 10;
  const price_monthly_ngn = parseInt(formData.get('price_monthly_ngn') as string, 10) || price_ngn;
  const price_annual_ngn = parseInt(formData.get('price_annual_ngn') as string, 10) || price_ngn * 10;
  const annual_discount_percentage = parseFloat(formData.get('annual_discount_percentage') as string) || 16.67;
  const allow_telegram = formData.get('allow_telegram') === 'true';
  const allow_whatsapp = formData.get('allow_whatsapp') === 'true';
  const telegram_message_limit = parseInt(formData.get('telegram_message_limit') as string, 10) || 100;
  const whatsapp_message_limit = parseInt(formData.get('whatsapp_message_limit') as string, 10) || 100;
  const monthly_token_limit = parseInt(formData.get('monthly_token_limit') as string, 10) || 100000;
  const max_workspaces = parseInt(formData.get('max_workspaces') as string, 10) || 1;
  const is_active = formData.get('is_active') === 'true';
  const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0;
  
  // NEW PHASE 3 FIELDS
  const ai_message_cap = parseInt(formData.get('ai_message_cap') as string, 10) || 200;
  const knowledge_doc_cap = parseInt(formData.get('knowledge_doc_cap') as string, 10) || 10;
  const crm_lead_cap = parseInt(formData.get('crm_lead_cap') as string, 10) || 50;
  const has_whatsapp = formData.get('has_whatsapp') === 'true';
  const has_telegram = formData.get('has_telegram') === 'true';
  const is_enterprise_contact_sales = formData.get('is_enterprise_contact_sales') === 'true';

  let features: Record<string, boolean> = {};
  try {
    features = JSON.parse(formData.get('features') as string || '{}');
  } catch {
    return { error: 'Invalid features JSON' };
  }

  if (!id || !name) return { error: 'Missing required fields' };

  const supabase = createServiceClient();

  const { error } = await supabase
    .from('subscription_plans')
    .update({
      name,
      price_usd,
      price_ngn,
      price_monthly_usd,
      price_annual_usd,
      price_monthly_ngn,
      price_annual_ngn,
      annual_discount_percentage,
      features,
      allow_telegram,
      allow_whatsapp,
      telegram_message_limit,
      whatsapp_message_limit,
      monthly_token_limit,
      max_workspaces,
      is_active,
      sort_order,
      // NEW PHASE 3 FIELDS
      ai_message_cap,
      knowledge_doc_cap,
      crm_lead_cap,
      has_whatsapp,
      has_telegram,
      is_enterprise_contact_sales,
    })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/super-admin/plans');
  return { error: null };
}

export async function deletePlan(formData: FormData) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const id = formData.get('id') as string;
  if (!id) return { error: 'Missing plan ID' };

  const supabase = createServiceClient();
  const { error } = await supabase.from('subscription_plans').delete().eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/super-admin/plans');
  return { error: null };
}
