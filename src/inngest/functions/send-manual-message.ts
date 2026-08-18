import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';

// Deliver a human-agent WhatsApp reply via the Meta Graph API
export const sendManualWhatsApp = inngest.createFunction(
  {
    id: 'send-manual-whatsapp',
    triggers: [{ event: 'whatsapp.send_manual' }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { workspaceId, recipient, content } = event.data;

    return await step.run('deliver-whatsapp', async () => {
      const db = createServiceClient();
      const { data: ws } = await db
        .from('workspaces')
        .select('whatsapp_phone_number_id, whatsapp_access_token')
        .eq('id', workspaceId)
        .single();

      if (!ws?.whatsapp_access_token || !ws?.whatsapp_phone_number_id) {
        return { success: false, reason: 'missing_credentials' };
      }

      let accessToken: string;
      let phoneId: string;
      try { accessToken = decrypt(ws.whatsapp_access_token); } catch { accessToken = ws.whatsapp_access_token; }
      try { phoneId = decrypt(ws.whatsapp_phone_number_id); } catch { phoneId = ws.whatsapp_phone_number_id; }

      const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipient,
          type: 'text',
          text: { body: content },
        }),
      });

      return { success: res.ok };
    });
  }
);

// Deliver a human-agent Telegram reply via the Telegram Bot API
export const sendManualTelegram = inngest.createFunction(
  {
    id: 'send-manual-telegram',
    triggers: [{ event: 'telegram.send_manual' }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { workspaceId, recipient, platformUserId, content } = event.data;

    return await step.run('deliver-telegram', async () => {
      const db = createServiceClient();
      const { data: ws } = await db
        .from('workspaces')
        .select('telegram_bot_token')
        .eq('id', workspaceId)
        .single();

      if (!ws?.telegram_bot_token) {
        return { success: false, reason: 'missing_credentials' };
      }

      let token: string;
      try { token = decrypt(ws.telegram_bot_token); } catch { token = ws.telegram_bot_token; }

      // Telegram chat ids are stored prefixed with "tg_" in the CRM
      const rawChatId = (platformUserId ?? recipient ?? '').toString().replace('tg_', '');

      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: rawChatId, text: content }),
      });

      return { success: res.ok };
    });
  }
);
