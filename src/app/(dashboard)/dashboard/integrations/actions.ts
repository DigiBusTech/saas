'use server';

import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const telegramSchema = z.object({
  platform: z.literal('telegram'),
  bot_token: z.string().regex(/^\d+:[A-Za-z0-9_-]{30,}$/, 'Invalid Telegram bot token format'),
  verify_secret: z.string().min(16, 'Secret must be at least 16 characters'),
});

const whatsappSchema = z.object({
  platform: z.literal('whatsapp'),
  phone_number_id: z.string().regex(/^\d+$/, 'Phone Number ID must be numeric'),
  access_token: z.string().min(20, 'Access token looks too short'),
  verify_secret: z.string().min(16, 'Secret must be at least 16 characters'),
});

export async function saveIntegration(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();
  if (!profile?.tenant_id) return { error: 'No tenant found' };

  const platform = formData.get('platform') as string;
  const raw: Record<string, any> = { platform };

  if (platform === 'telegram') {
    raw.bot_token = formData.get('bot_token');
    raw.verify_secret = formData.get('verify_secret');
    const parsed = telegramSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    raw.bot_token = encrypt(raw.bot_token);
  } else {
    raw.phone_number_id = formData.get('phone_number_id');
    raw.access_token = formData.get('access_token');
    raw.verify_secret = formData.get('verify_secret');
    const parsed = whatsappSchema.safeParse(raw);
    if (!parsed.success) return { error: parsed.error.issues[0].message };
    raw.access_token = encrypt(raw.access_token);
  }

  // Check if integration exists for this tenant+platform
  const { data: existing } = await supabase
    .from('integrations')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .eq('platform', platform)
    .single();

  const payload = { ...raw, tenant_id: profile.tenant_id, is_active: true };

  if (existing) {
    const { error } = await supabase.from('integrations').update(payload).eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('integrations').insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath('/dashboard/integrations');
  return { success: true };
}

export async function toggleIntegration(id: string, isActive: boolean) {
  const supabase = await createClient();
  await supabase.from('integrations').update({ is_active: !isActive }).eq('id', id);
  revalidatePath('/dashboard/integrations');
}

export async function deleteIntegration(id: string) {
  const supabase = await createClient();
  await supabase.from('integrations').delete().eq('id', id);
  revalidatePath('/dashboard/integrations');
}
