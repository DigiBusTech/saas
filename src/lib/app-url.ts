import { createServiceClient } from '@/lib/supabase/server';

async function resolveCanonicalUrl(value: string): Promise<string> {
  const normalized = value.replace(/\/$/, '');

  try {
    const response = await fetch(normalized, {
      method: 'HEAD',
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    return response.url.replace(/\/$/, '');
  } catch {
    return normalized;
  }
}

export async function getPublicAppUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && !configured.includes('yourdomain.com')) return resolveCanonicalUrl(configured);

  try {
    const db = createServiceClient();
    const { data } = await db
      .from('system_configs')
      .select('config_value, is_secret')
      .eq('config_key', 'NEXT_PUBLIC_APP_URL')
      .maybeSingle();
    if (data?.config_value && !data.config_value.includes('yourdomain.com')) return resolveCanonicalUrl(data.config_value);
  } catch {
    // Fall through to a deployment-safe relative URL.
  }

  return '';
}
