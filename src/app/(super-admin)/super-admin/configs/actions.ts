'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { encrypt, decrypt, maskSecret } from '@/lib/encryption';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';

export async function getConfigs() {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { configs: [], error: guard.error };
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('system_configs')
    .select('*')
    .order('config_key');

  if (error) return { configs: [], error: error.message };

  // Mask secret values for display
  const masked = (data ?? []).map((c: any) => {
    let displayValue = c.config_value || '';
    if (c.is_secret && c.config_value) {
      try { displayValue = maskSecret(decrypt(c.config_value)); } catch { displayValue = maskSecret(c.config_value); }
    }
    return { ...c, display_value: displayValue };
  });

  return { configs: masked, error: null };
}

export async function updateConfig(formData: FormData) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const id = formData.get('id') as string;
  const rawValue = formData.get('config_value') as string;
  const isSecret = formData.get('is_secret') === 'true';

  if (!id || rawValue === null) {
    return { error: 'Missing required fields' };
  }

  const supabase = createServiceClient();

  // Encrypt secret values before storing
  const storedValue = isSecret && rawValue ? encrypt(rawValue) : rawValue;

  const { error } = await supabase
    .from('system_configs')
    .update({ config_value: storedValue })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath('/super-admin/configs');
  return { error: null };
}
