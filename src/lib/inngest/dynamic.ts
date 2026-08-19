import { Inngest } from 'inngest';
import { createServiceClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';

async function getEventKey() {
  const db = createServiceClient();
  const { data } = await db.from('system_configs').select('config_value, is_secret').eq('config_key', 'INNGEST_EVENT_KEY').maybeSingle();
  if (data?.config_value) {
    try { return data.is_secret ? decrypt(data.config_value) : data.config_value; } catch { return data.config_value; }
  }
  return process.env.INNGEST_EVENT_KEY || '';
}

export async function sendInngestEvent(event: { name: string; data: Record<string, unknown> }) {
  const eventKey = await getEventKey();
  if (!eventKey) throw new Error('Inngest event key is not configured. Add INNGEST_EVENT_KEY in Super Admin > Configs and in the deployment environment.');
  const client = new Inngest({ id: 'sabibio-runtime', eventKey });
  return client.send(event);
}
