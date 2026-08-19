'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { encrypt, decrypt, maskSecret } from '@/lib/encryption';
import { getPublicAppUrl } from '@/lib/app-url';

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
  try {
    const platform = formData.get('platform') as string;
    const supabase = await createClient();

    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('id', workspaceId)
      .single();
    if (!workspace) return { error: 'Workspace not found or you do not have access to it.' };

    const update: Record<string, any> = { updated_at: new Date().toISOString() };

    if (platform === 'telegram') {
    const token = String(formData.get('telegram_bot_token') ?? '').trim();
    const webhookSecret = String(formData.get('telegram_webhook_secret') ?? '').trim();
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

    if (platform === 'telegram') {
      const { data: stored } = await supabase
        .from('workspaces')
        .select('telegram_bot_token, telegram_webhook_secret')
        .eq('id', workspaceId)
        .single();
      let token = String(formData.get('telegram_bot_token') ?? '').trim();
      let secret = String(formData.get('telegram_webhook_secret') ?? '').trim();
      try { if (!token && stored?.telegram_bot_token) token = decrypt(stored.telegram_bot_token); } catch { return { error: 'Stored Telegram bot token cannot be decrypted. Re-enter it and verify ENCRYPTION_KEY.' }; }
      try { if (!secret && stored?.telegram_webhook_secret) secret = decrypt(stored.telegram_webhook_secret); } catch { return { error: 'Stored Telegram webhook secret cannot be decrypted. Re-enter it and verify ENCRYPTION_KEY.' }; }
      const publicUrl = await getPublicAppUrl();
      if (!token || !secret) return { error: 'Telegram bot token and webhook secret are required.' };
      if (!publicUrl) return { error: 'Credentials were not saved: set NEXT_PUBLIC_APP_URL in Vercel or Super Admin Configs before registering Telegram.' };
      if (token && secret && publicUrl) {
        const webhookUrl = `${publicUrl}/api/webhooks/telegram/${workspaceId}`;
        const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}&secret_token=${encodeURIComponent(secret)}`, { method: 'POST', signal: AbortSignal.timeout(10000) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.ok !== true) return { error: `Credentials saved, but Telegram webhook setup failed: ${result.description ?? response.statusText}` };
      }
    }

    revalidatePath(`/dashboard/${workspaceId}/integrations`);
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not save integration settings' };
  }
}

export async function verifyTelegramWebhook(workspaceId: string) {
  try {
    const supabase = await createClient();
    const { data: stored } = await supabase.from('workspaces').select('telegram_bot_token, telegram_webhook_secret').eq('id', workspaceId).single();
    if (!stored?.telegram_bot_token) return { error: 'No Telegram bot token is saved.' };
    let token: string;
    try { token = decrypt(stored.telegram_bot_token); } catch { token = stored.telegram_bot_token; }
    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, { signal: AbortSignal.timeout(10000) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) return { error: result.description ?? `Telegram returned HTTP ${response.status}` };

    const publicUrl = await getPublicAppUrl();
    let secret = '';
    if (stored.telegram_webhook_secret) {
      try { secret = decrypt(stored.telegram_webhook_secret); } catch { secret = stored.telegram_webhook_secret; }
    }
    const expectedUrl = publicUrl ? `${publicUrl}/api/webhooks/telegram/${workspaceId}` : '';
    if (expectedUrl && secret && result.result?.url !== expectedUrl) {
      const updateResponse = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(expectedUrl)}&secret_token=${encodeURIComponent(secret)}`, { method: 'POST', signal: AbortSignal.timeout(10000) });
      const updateResult = await updateResponse.json().catch(() => ({}));
      if (!updateResponse.ok || updateResult.ok !== true) return { error: `Telegram webhook repair failed: ${updateResult.description ?? updateResponse.statusText}` };
      return { data: { ...result.result, url: expectedUrl, last_error_message: undefined } };
    }

    return { data: result.result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not verify Telegram webhook' };
  }
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
