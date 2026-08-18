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
  const stripe_price_id = (formData.get('stripe_price_id') as string) || '';
  const allow_telegram = formData.get('allow_telegram') === 'true';
  const allow_whatsapp = formData.get('allow_whatsapp') === 'true';
  const telegram_message_limit = parseInt(formData.get('telegram_message_limit') as string, 10) || 100;
  const whatsapp_message_limit = parseInt(formData.get('whatsapp_message_limit') as string, 10) || 100;
  const monthly_token_limit = parseInt(formData.get('monthly_token_limit') as string, 10) || 100000;
  const max_workspaces = parseInt(formData.get('max_workspaces') as string, 10) || 1;
  const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0;

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
    stripe_price_id,
    features,
    allow_telegram,
    allow_whatsapp,
    telegram_message_limit,
    whatsapp_message_limit,
    monthly_token_limit,
    max_workspaces,
    sort_order,
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
  const stripe_price_id = (formData.get('stripe_price_id') as string) || '';
  const allow_telegram = formData.get('allow_telegram') === 'true';
  const allow_whatsapp = formData.get('allow_whatsapp') === 'true';
  const telegram_message_limit = parseInt(formData.get('telegram_message_limit') as string, 10) || 100;
  const whatsapp_message_limit = parseInt(formData.get('whatsapp_message_limit') as string, 10) || 100;
  const monthly_token_limit = parseInt(formData.get('monthly_token_limit') as string, 10) || 100000;
  const max_workspaces = parseInt(formData.get('max_workspaces') as string, 10) || 1;
  const is_active = formData.get('is_active') === 'true';
  const sort_order = parseInt(formData.get('sort_order') as string, 10) || 0;

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
      stripe_price_id,
      features,
      allow_telegram,
      allow_whatsapp,
      telegram_message_limit,
      whatsapp_message_limit,
      monthly_token_limit,
      max_workspaces,
      is_active,
      sort_order,
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
