import { createServiceClient } from '@/lib/supabase/server';

export async function getPublicAppUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && !configured.includes('yourdomain.com')) return configured.replace(/\/$/, '');

  try {
    const db = createServiceClient();
    const { data } = await db
      .from('system_configs')
      .select('config_value, is_secret')
      .eq('config_key', 'NEXT_PUBLIC_APP_URL')
      .maybeSingle();
    if (data?.config_value && !data.config_value.includes('yourdomain.com')) return data.config_value.replace(/\/$/, '');
  } catch {
    // Fall through to a deployment-safe relative URL.
  }

  return '';
}
