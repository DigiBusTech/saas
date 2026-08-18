'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import {
  DEFAULT_SABIBIO_BRANDING,
  DEFAULT_SABIBIO_CHANNELS,
  DEFAULT_SABIBIO_SOCIALS,
  type SabiBioLink,
} from '@/lib/sabibio/templates';

interface SabiBioConfig {
  sabibio_enabled: boolean;
  sabibio_template_id: string;
  sabibio_branding: Record<string, unknown>;
  sabibio_links: SabiBioLink[];
  sabibio_channels: Record<string, unknown>;
  sabibio_socials: Record<string, string>;
  sabibio_products: string[];
  sabibio_legal: Record<string, unknown>;
}

export async function getSabiBioConfig(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('workspaces')
    .select('id, tenant_id, name, slug, logo_url, whatsapp_phone_number_id, whatsapp_access_token, telegram_bot_token, sabibio_enabled, sabibio_template_id, sabibio_branding, sabibio_links, sabibio_channels, sabibio_socials, sabibio_products, sabibio_legal')
    .eq('id', workspaceId)
    .single();

  if (error || !data) return { data: null, error: error?.message ?? 'Workspace not found' };

  const savedChannels = (data.sabibio_channels ?? {}) as Record<string, unknown>;
  const derivedChannels = {
    ...DEFAULT_SABIBIO_CHANNELS,
    ...savedChannels,
    whatsapp_enabled: Boolean(data.whatsapp_phone_number_id && data.whatsapp_access_token) || savedChannels.whatsapp_enabled === true,
    telegram_enabled: Boolean(data.telegram_bot_token) || savedChannels.telegram_enabled === true,
  };

  return {
    data: {
      ...data,
      sabibio_enabled: data.sabibio_enabled ?? true,
      sabibio_template_id: data.sabibio_template_id ?? 'tech-minimal',
      sabibio_branding: { ...DEFAULT_SABIBIO_BRANDING, ...(data.sabibio_branding ?? {}) },
      sabibio_links: (data.sabibio_links ?? []) as SabiBioLink[],
      sabibio_channels: derivedChannels,
      sabibio_socials: { ...DEFAULT_SABIBIO_SOCIALS, ...(data.sabibio_socials ?? {}) },
      sabibio_products: (data.sabibio_products ?? []) as string[],
      sabibio_legal: { privacy_policy: '', terms_of_service: '', disclaimer: '', cookie_policy: '', cookie_consent_required: false, ...(data.sabibio_legal ?? {}) },
    },
    error: null,
  };
}

async function updateConfig(workspaceId: string, update: Record<string, unknown>) {
  const supabase = await createClient();
  const { error } = await supabase.from('workspaces').update(update).eq('id', workspaceId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/${workspaceId}/sabibio`);
  revalidatePath(`/${update.sabibio_slug ?? ''}`);
  return { error: null };
}

export async function updateSabiBioSettings(workspaceId: string, formData: FormData) {
  const templateId = String(formData.get('template_id') ?? 'tech-minimal');
  const enabled = formData.get('enabled') === 'true';
  const slug = String(formData.get('slug') ?? '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  const branding = JSON.parse(String(formData.get('branding') ?? '{}')) as Record<string, unknown>;
  const links = JSON.parse(String(formData.get('links') ?? '[]')) as SabiBioLink[];
  const channels = JSON.parse(String(formData.get('channels') ?? '{}')) as Record<string, unknown>;
  const socials = JSON.parse(String(formData.get('socials') ?? '{}')) as Record<string, string>;
  const products = JSON.parse(String(formData.get('products') ?? '[]')) as string[];
  const legal = JSON.parse(String(formData.get('legal') ?? '{}')) as Record<string, unknown>;

  if (!slug) return { error: 'A public slug is required' };
  if (slug.length < 3 || slug.length > 60) return { error: 'Slug must be between 3 and 60 characters' };

  const supabase = await createClient();
  const { data: duplicate } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .neq('id', workspaceId)
    .maybeSingle();
  if (duplicate) return { error: 'That public slug is already in use' };

  return updateConfig(workspaceId, {
    sabibio_enabled: enabled,
    sabibio_template_id: templateId,
    sabibio_branding: branding,
    sabibio_links: links,
    sabibio_channels: channels,
    sabibio_socials: socials,
    sabibio_products: products,
    sabibio_legal: legal,
    slug,
    updated_at: new Date().toISOString(),
  });
}

export async function checkSabiBioSlug(workspaceId: string, slug: string) {
  const normalized = slug.trim().toLowerCase();
  const supabase = await createClient();
  const { data } = await supabase.from('workspaces').select('id').eq('slug', normalized).neq('id', workspaceId).maybeSingle();
  return { available: !data };
}

export async function uploadSabiBioMedia(workspaceId: string, formData: FormData) {
  const file = formData.get('file');
  if (!(file instanceof File)) return { error: 'Choose an image first' };
  if (!file.type.startsWith('image/')) return { error: 'Only image files are supported' };
  if (file.size > 5 * 1024 * 1024) return { error: 'Images must be smaller than 5 MB' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .eq('tenant_id', profile?.tenant_id ?? '')
    .single();
  if (!workspace) return { error: 'Workspace not found or unauthorized' };

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${workspaceId}/${crypto.randomUUID()}.${extension}`;
  const storage = createServiceClient().storage.from('sabibio-media');
  const { error } = await storage.upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: error.message };
  const { data } = storage.getPublicUrl(path);
  return { url: data.publicUrl };
}
