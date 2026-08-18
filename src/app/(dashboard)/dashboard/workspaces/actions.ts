'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { encrypt, decrypt, maskSecret } from '@/lib/encryption';

// ---------- Workspace CRUD ----------

export async function getWorkspaces() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated', data: null };

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) return { error: 'No tenant', data: null };

  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('tenant_id', profile.tenant_id)
    .order('created_at', { ascending: true });

  return { data, error: error?.message ?? null };
}

export async function getWorkspaceById(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .eq('id', workspaceId)
    .single();

  return { data, error: error?.message ?? null };
}

export async function getWorkspacePlanLimit() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { maxWorkspaces: 1, currentCount: 0 };

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) return { maxWorkspaces: 1, currentCount: 0 };

  // Get tenant plan
  const { data: tenant } = await svc
    .from('tenants')
    .select('plan_id')
    .eq('id', profile.tenant_id)
    .single();

  let maxWorkspaces = 1;
  if (tenant?.plan_id) {
    const { data: plan } = await svc
      .from('subscription_plans')
      .select('max_workspaces')
      .eq('id', tenant.plan_id)
      .single();
    maxWorkspaces = plan?.max_workspaces ?? 1;
  }

  // Count existing workspaces
  const { count } = await supabase
    .from('workspaces')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', profile.tenant_id);

  return { maxWorkspaces, currentCount: count ?? 0 };
}

export async function createWorkspace(formData: FormData) {
  const name = formData.get('name') as string;
  const slug = (formData.get('slug') as string)
    ?.toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const botPersona = (formData.get('bot_persona') as string) || 'Professional English';

  if (!name || !slug) return { error: 'Name and slug are required' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) return { error: 'No tenant' };

  // Check plan limit
  const { maxWorkspaces, currentCount } = await getWorkspacePlanLimit();
  if (currentCount >= maxWorkspaces) {
    return { error: `Workspace limit reached (${currentCount}/${maxWorkspaces}). Upgrade your plan to add more businesses.` };
  }

  const { data, error } = await supabase
    .from('workspaces')
    .insert({
      tenant_id: profile.tenant_id,
      name,
      slug,
      bot_persona: botPersona,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') return { error: 'A workspace with this slug already exists' };
    return { error: error.message };
  }

  revalidatePath('/dashboard');
  return { data, error: null };
}

export async function updateWorkspace(workspaceId: string, formData: FormData) {
  const name = formData.get('name') as string;
  const botPersona = formData.get('bot_persona') as string;
  const agentMode = formData.get('agent_mode') as string;
  const customPrompt = formData.get('custom_prompt') as string;

  const supabase = await createClient();
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (name) update.name = name;
  if (botPersona) update.bot_persona = botPersona;
  if (agentMode) update.agent_mode = agentMode;
  if (botPersona === 'Custom Prompt') update.custom_prompt = customPrompt ?? '';

  const { error } = await supabase
    .from('workspaces')
    .update(update)
    .eq('id', workspaceId);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return { error: null };
}

// ---------- Workspace Integration Credentials ----------

export async function saveWorkspaceIntegration(workspaceId: string, formData: FormData) {
  const platform = formData.get('platform') as string;
  const supabase = await createClient();

  const update: Record<string, any> = { updated_at: new Date().toISOString() };

  if (platform === 'telegram') {
    const token = formData.get('telegram_bot_token') as string;
    const webhookSecret = formData.get('telegram_webhook_secret') as string;
    if (token) update.telegram_bot_token = encrypt(token);
    if (webhookSecret) update.telegram_webhook_secret = encrypt(webhookSecret);
  } else if (platform === 'whatsapp') {
    const phoneId = formData.get('whatsapp_phone_number_id') as string;
    const accessToken = formData.get('whatsapp_access_token') as string;
    const verifyToken = formData.get('whatsapp_verify_token') as string;
    if (phoneId) update.whatsapp_phone_number_id = encrypt(phoneId);
    if (accessToken) update.whatsapp_access_token = encrypt(accessToken);
    if (verifyToken) update.whatsapp_verify_token = encrypt(verifyToken);
  }

  const { error } = await supabase
    .from('workspaces')
    .update(update)
    .eq('id', workspaceId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/${workspaceId}/integrations`);
  return { error: null };
}

export async function getWorkspaceIntegrationStatus(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('workspaces')
    .select('telegram_bot_token, telegram_webhook_secret, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_verify_token')
    .eq('id', workspaceId)
    .single();

  if (!data) return { telegram: false, whatsapp: false, maskedTokens: {} };

  const maskedTokens: Record<string, string> = {};
  try {
    if (data.telegram_bot_token) maskedTokens.telegram_bot_token = maskSecret(decrypt(data.telegram_bot_token));
    if (data.telegram_webhook_secret) maskedTokens.telegram_webhook_secret = maskSecret(decrypt(data.telegram_webhook_secret));
    if (data.whatsapp_phone_number_id) maskedTokens.whatsapp_phone_number_id = maskSecret(decrypt(data.whatsapp_phone_number_id));
    if (data.whatsapp_access_token) maskedTokens.whatsapp_access_token = maskSecret(decrypt(data.whatsapp_access_token));
    if (data.whatsapp_verify_token) maskedTokens.whatsapp_verify_token = maskSecret(decrypt(data.whatsapp_verify_token));
  } catch {
    // tokens may not be encrypted yet (legacy data)
  }

  return {
    telegram: !!(data.telegram_bot_token && data.telegram_webhook_secret),
    whatsapp: !!(data.whatsapp_phone_number_id && data.whatsapp_access_token),
    maskedTokens,
  };
}

// ---------- Delete Workspace ----------

export async function deleteWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();
  if (!profile?.tenant_id) return { error: 'No tenant' };

  // Never allow deleting a tenant's last remaining workspace.
  const { count } = await supabase
    .from('workspaces')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', profile.tenant_id);
  if ((count ?? 0) <= 1) {
    return { error: 'You must keep at least one workspace. Create another before deleting this one.' };
  }

  const { error } = await supabase
    .from('workspaces')
    .delete()
    .eq('id', workspaceId)
    .eq('tenant_id', profile.tenant_id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  return { error: null };
}
