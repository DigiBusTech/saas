'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { encrypt, decrypt, maskSecret } from '@/lib/encryption';
import { testProviderConnection } from '@/lib/ai/router';
import { logTelemetry, normalizeError } from '@/lib/telemetry';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';

export async function getProviders() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('ai_provider_configs')
    .select('*')
    .order('priority', { ascending: true });

  if (error) return { providers: [], error: error.message };

  const masked = (data ?? []).map((p: any) => {
    let display_key = '••••';
    try {
      display_key = maskSecret(decrypt(p.api_key_encrypted));
    } catch {
      display_key = maskSecret(p.api_key_encrypted || '');
    }
    return { ...p, display_key };
  });

  return { providers: masked, error: null };
}

export async function upsertProvider(formData: FormData) {
  try {
    const guard = await requireSuperAdmin();
    if ('error' in guard) return { error: guard.error };
    const supabase = createServiceClient();

    const id = (formData.get('id') as string) || null;
    const provider_name = formData.get('provider_name') as string;
    const base_url = (formData.get('base_url') as string) || 'https://api.openai.com/v1';
    const model_name = formData.get('model_name') as string;
    const rawApiKey = (formData.get('api_key') as string) || '';
    const priority = parseInt((formData.get('priority') as string) || '1', 10);
    const is_primary = formData.get('is_primary') === 'on' || formData.get('is_primary') === 'true';
    const is_fallback = formData.get('is_fallback') === 'on' || formData.get('is_fallback') === 'true';
    const is_active = formData.get('is_active') === 'on' || formData.get('is_active') === 'true';

    if (!provider_name || !model_name) {
      return { error: 'Provider Name and Model Name are required' };
    }

    const payload: Record<string, any> = {
      provider_name,
      base_url,
      model_name,
      priority: isNaN(priority) ? 1 : priority,
      is_primary,
      is_fallback,
      is_active,
    };

    // Only (re)encrypt the API key if a new one was provided.
    if (rawApiKey) {
      payload.api_key_encrypted = encrypt(rawApiKey);
    }

    // If this provider is marked primary, unset primary on all others.
    if (is_primary) {
      await supabase
        .from('ai_provider_configs')
        .update({ is_primary: false })
        .neq('id', id ?? '00000000-0000-0000-0000-000000000000');
    }

    if (id) {
      const { error } = await supabase.from('ai_provider_configs').update(payload).eq('id', id);
      if (error) return { error: error.message };
    } else {
      if (!rawApiKey) return { error: 'API Key is required for a new provider' };
      const { error } = await supabase.from('ai_provider_configs').insert(payload);
      if (error) return { error: error.message };
    }

    revalidatePath('/super-admin/ai-providers');
    return { success: true };
  } catch (err) {
    const { message, stack } = normalizeError(err);
    await logTelemetry({
      severity: 'error',
      source: 'llm_router',
      endpoint: 'upsertProvider',
      message,
      stackTrace: stack,
    });
    return { error: message };
  }
}

export async function deleteProvider(id: string) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const supabase = createServiceClient();
  const { error } = await supabase.from('ai_provider_configs').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/super-admin/ai-providers');
  return { success: true };
}

/**
 * Test connection using the stored (encrypted) key OR a newly-provided key.
 */
export async function testProvider(params: {
  id?: string;
  base_url: string;
  model_name: string;
  api_key?: string;
}) {
  try {
    const guard = await requireSuperAdmin();
    if ('error' in guard) return { ok: false, message: guard.error };
    let apiKey = params.api_key || '';

    if (!apiKey && params.id) {
      const supabase = createServiceClient();
      const { data } = await supabase
        .from('ai_provider_configs')
        .select('api_key_encrypted')
        .eq('id', params.id)
        .single();
      if (data?.api_key_encrypted) {
        try {
          apiKey = decrypt(data.api_key_encrypted);
        } catch {
          apiKey = data.api_key_encrypted;
        }
      }
    }

    if (!apiKey) return { ok: false, message: 'No API key available to test.' };

    const result = await testProviderConnection({
      base_url: params.base_url,
      model_name: params.model_name,
      apiKey,
    });
    return result;
  } catch (err) {
    const { message } = normalizeError(err);
    return { ok: false, message };
  }
}
