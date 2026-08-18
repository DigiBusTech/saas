import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/server';
import { decrypt } from '@/lib/encryption';
import { executeLLMRequest } from '@/lib/ai/router';

/**
 * Daily cron job: scans workspace_crm for expiring subscriptions,
 * matches against workspace_automations rules, generates persona-aware
 * messages via Groq LLM, and delivers rich-media payloads.
 */
export const broadcastCron = inngest.createFunction(
  {
    id: 'broadcast-expiry-cron',
    triggers: [{ cron: '0 8 * * *' }], // Runs daily at 8:00 AM UTC
  },
  async ({ step }: { step: any }) => {
    const db = createServiceClient();

    // Step 1: Fetch all active workspaces
    const workspaces = await step.run('fetch-active-workspaces', async () => {
      const { data } = await db
        .from('workspaces')
        .select('id, tenant_id, bot_persona, custom_prompt, telegram_bot_token, whatsapp_phone_number_id, whatsapp_access_token')
        .eq('is_active', true);
      return data ?? [];
    });

    let totalSent = 0;

    for (const workspace of workspaces) {
      // Step 2: Fetch active automations for this workspace
      const automations = await step.run(`fetch-automations-${workspace.id}`, async () => {
        const { data } = await db
          .from('workspace_automations')
          .select('*')
          .eq('workspace_id', workspace.id)
          .eq('is_active', true);
        return data ?? [];
      });

      if (automations.length === 0) continue;

      // Step 3: For each automation, find matching CRM records
      for (const automation of automations) {
        const matchingLeads = await step.run(
          `match-leads-${automation.id}`,
          async () => {
            const now = new Date();

            if (automation.trigger_type === 'subscription_expiring') {
              const targetDate = new Date();
              targetDate.setDate(targetDate.getDate() + (automation.trigger_days_before || 3));
              const startOfDay = new Date(targetDate);
              startOfDay.setHours(0, 0, 0, 0);
              const endOfDay = new Date(targetDate);
              endOfDay.setHours(23, 59, 59, 999);

              const { data } = await db
                .from('workspace_crm')
                .select('*')
                .eq('workspace_id', workspace.id)
                .eq('subscription_status', 'subscriber')
                .gte('subscription_expiry', startOfDay.toISOString())
                .lte('subscription_expiry', endOfDay.toISOString());

              return data ?? [];
            }

            if (automation.trigger_type === 'new_lead') {
              const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
              const { data } = await db
                .from('workspace_crm')
                .select('*')
                .eq('workspace_id', workspace.id)
                .gte('last_interaction', oneDayAgo.toISOString())
                .contains('tags', ['New Lead']);

              return data ?? [];
            }

            if (automation.trigger_type === 'post_purchase') {
              const { data } = await db
                .from('workspace_crm')
                .select('*')
                .eq('workspace_id', workspace.id)
                .contains('tags', ['Post Purchase'])
                .gte('last_interaction', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString());

              return data ?? [];
            }

            // Broadcast type: send to all leads
            if (automation.trigger_type === 'broadcast') {
              const { data } = await db
                .from('workspace_crm')
                .select('*')
                .eq('workspace_id', workspace.id);
              return data ?? [];
            }

            return [];
          }
        );

        if (matchingLeads.length === 0) continue;

        // Step 4: Generate personalized messages and send
        await step.run(`send-automation-${automation.id}`, async () => {
          for (const lead of matchingLeads) {
            // Resolve template variables
            let message = automation.message_template
              .replace(/\{customer_name\}/g, lead.customer_name || 'Valued Customer')
              .replace(/\{expiry_date\}/g, lead.subscription_expiry
                ? new Date(lead.subscription_expiry).toLocaleDateString()
                : 'N/A')
              .replace(/\{product_name\}/g, 'your subscription');

            // Enhance with LLM persona if configured
            try {
              const personaPrompt = getPersonaPrompt(workspace.bot_persona || 'Professional English', workspace.custom_prompt);
              const result = await executeLLMRequest({
                prompt: message,
                systemInstruction: `You are a customer engagement assistant. ${personaPrompt}\nRewrite the following message in that exact tone while keeping all key information intact. Keep it concise (max 2 short paragraphs). Do not add greetings if one already exists.`,
                maxTokens: 300,
                temperature: 0.8,
              });
              if (result.text) message = result.text;
            } catch {
              // Use template as-is if LLM fails
            }

            // Append CTA if present
            if (automation.cta_button_text && automation.cta_link) {
              message += `\n\n${automation.cta_button_text}: ${automation.cta_link}`;
            }

            // Deliver via platform
            if (lead.platform === 'telegram' && workspace.telegram_bot_token) {
              await sendTelegramRichMedia(
                workspace.telegram_bot_token,
                lead.platform_user_id,
                message,
                automation.media_url,
                automation.cta_button_text,
                automation.cta_link
              );
              totalSent++;
            } else if (lead.platform === 'whatsapp' && workspace.whatsapp_access_token) {
              await sendWhatsAppRichMedia(
                workspace.whatsapp_phone_number_id,
                workspace.whatsapp_access_token,
                lead.platform_user_id,
                message,
                automation.media_url
              );
              totalSent++;
            }
          }
        });
      }
    }

    return { totalSent, workspacesProcessed: workspaces.length };
  }
);

function getPersonaPrompt(persona: string, customPrompt?: string | null): string {
  if (persona === 'Custom Prompt' && customPrompt) return customPrompt;
  const map: Record<string, string> = {
    'Professional English': 'Use formal, professional English.',
    'Casual English': 'Use a friendly, casual conversational tone.',
    'Nigerian Pidgin': 'Use Nigerian Pidgin English. Be warm and relatable.',
    'Yoruba-Infused English': 'Mix English with common Yoruba expressions naturally.',
    'Hausa-Infused English': 'Mix English with common Hausa expressions naturally.',
  };
  return map[persona] ?? 'Use a professional tone.';
}

async function sendTelegramRichMedia(
  encryptedToken: string,
  chatId: string,
  text: string,
  mediaUrl?: string | null,
  ctaText?: string | null,
  ctaLink?: string | null
) {
  let token: string;
  try { token = decrypt(encryptedToken); } catch { token = encryptedToken; }

  const inlineKeyboard = ctaText && ctaLink
    ? { inline_keyboard: [[{ text: ctaText, url: ctaLink }]] }
    : undefined;

  if (mediaUrl) {
    // Send photo with caption
    await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: mediaUrl,
        caption: text,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard,
      }),
    }).catch(console.error);
  } else {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
        reply_markup: inlineKeyboard,
      }),
    }).catch(console.error);
  }
}

async function sendWhatsAppRichMedia(
  encryptedPhoneId: string,
  encryptedAccessToken: string,
  to: string,
  text: string,
  mediaUrl?: string | null
) {
  let phoneId: string;
  let accessToken: string;
  try { phoneId = decrypt(encryptedPhoneId); } catch { phoneId = encryptedPhoneId; }
  try { accessToken = decrypt(encryptedAccessToken); } catch { accessToken = encryptedAccessToken; }

  if (mediaUrl) {
    // Send image first
    await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'image',
        image: { link: mediaUrl, caption: text },
      }),
    }).catch(console.error);
  } else {
    await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    }).catch(console.error);
  }
}
