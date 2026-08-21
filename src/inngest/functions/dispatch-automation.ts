import { createServiceClient } from '@/lib/supabase/server';
import { sendBatchEmails, convertMarkdownToHtml, replaceVariables } from '@/lib/email';
import { inngest } from '@/inngest/client';

/**
 * Rate-limited message dispatcher with channel support
 * Handles WhatsApp, Telegram, and Email delivery
 */
export const dispatchAutomation = inngest.createFunction(
  { id: 'automation-dispatcher', name: 'Dispatch Automation Messages' },
  { event: 'automation/dispatch' },
  async ({ event, step }) => {
    const {
      automationId,
      workspaceId,
      channelFilter,
      messageTemplate,
      emailSubject,
      mediaUrl,
      ctaButtonText,
      ctaLink,
      batchSize = 50,
      rateLimitDelayMs = 35,
    } = event.data;

    const db = createServiceClient();

    // Step 1: Fetch eligible leads
    const leads = await step.run('fetch-eligible-leads', async () => {
      const { data, error } = await db.rpc('get_automation_eligible_leads', {
        p_workspace_id: workspaceId,
        p_channels: channelFilter,
      });

      if (error) {
        console.error('[dispatchAutomation] Failed to fetch leads:', error);
        throw new Error(`Failed to fetch leads: ${error.message}`);
      }

      return data || [];
    });

    if (leads.length === 0) {
      return { success: true, message: 'No eligible leads found', sent: 0 };
    }

    // Step 2: Group leads by channel
    const leadsByChannel = {
      whatsapp: leads.filter((l: any) => l.channel_type === 'whatsapp' && l.phone),
      telegram: leads.filter((l: any) => l.channel_type === 'telegram' && l.telegram_chat_id),
      email: leads.filter((l: any) => l.email && l.email !== ''),
    };

    let totalSent = 0;
    let totalFailed = 0;

    // Step 3: Dispatch WhatsApp messages (rate-limited)
    if (channelFilter.includes('whatsapp') && leadsByChannel.whatsapp.length > 0) {
      const whatsappResults = await step.run('dispatch-whatsapp', async () => {
        const chunks = chunkArray(leadsByChannel.whatsapp, batchSize);
        let sent = 0;
        let failed = 0;

        for (const [chunkIndex, chunk] of chunks.entries()) {
          for (const lead of chunk) {
            try {
              const message = replaceVariables(messageTemplate, {
                customer_name: lead.lead_name || 'Customer',
                business_name: workspaceId, // Fetch actual business name if needed
              });

              // Send WhatsApp message via Cloud API
              const response = await fetch(
                `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to: lead.phone,
                    type: mediaUrl ? 'image' : 'text',
                    ...(mediaUrl
                      ? {
                          image: {
                            link: mediaUrl,
                            caption: message,
                          },
                        }
                      : {
                          text: { body: message },
                        }),
                  }),
                }
              );

              if (response.ok) {
                await db.rpc('mark_automation_step_completed', {
                  p_automation_id: automationId,
                  p_lead_id: lead.lead_id,
                  p_step_number: 1,
                  p_channel: 'whatsapp',
                  p_recipient: lead.phone,
                  p_status: 'sent',
                });
                sent++;
              } else {
                const errorData = await response.json();
                await db.rpc('mark_automation_step_completed', {
                  p_automation_id: automationId,
                  p_lead_id: lead.lead_id,
                  p_step_number: 1,
                  p_channel: 'whatsapp',
                  p_recipient: lead.phone,
                  p_status: response.status === 429 ? 'rate_limited' : 'failed',
                });
                failed++;
                console.error('[WhatsApp Send Failed]', errorData);
              }

              // Rate limit: Default 1-2s delay for WhatsApp
              await new Promise((resolve) => setTimeout(resolve, rateLimitDelayMs || 1500));
            } catch (err) {
              console.error('[WhatsApp Send Exception]', err);
              failed++;
            }
          }

          // Pause 60 seconds between chunks to avoid 429
          if (chunkIndex < chunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 60000));
          }
        }

        return { sent, failed };
      });

      totalSent += whatsappResults.sent;
      totalFailed += whatsappResults.failed;
    }

    // Step 4: Dispatch Telegram messages (rate-limited 30 msg/sec)
    if (channelFilter.includes('telegram') && leadsByChannel.telegram.length > 0) {
      const telegramResults = await step.run('dispatch-telegram', async () => {
        const chunks = chunkArray(leadsByChannel.telegram, batchSize);
        let sent = 0;
        let failed = 0;

        for (const [chunkIndex, chunk] of chunks.entries()) {
          for (const lead of chunk) {
            try {
              const message = replaceVariables(messageTemplate, {
                customer_name: lead.lead_name || 'Customer',
              });

              const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
              const response = await fetch(telegramUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: lead.telegram_chat_id,
                  text: message,
                  parse_mode: 'Markdown',
                }),
              });

              if (response.ok) {
                await db.rpc('mark_automation_step_completed', {
                  p_automation_id: automationId,
                  p_lead_id: lead.lead_id,
                  p_step_number: 1,
                  p_channel: 'telegram',
                  p_recipient: lead.telegram_chat_id,
                  p_status: 'sent',
                });
                sent++;
              } else {
                failed++;
              }

              // Rate limit: 35ms for Telegram (30 msg/sec)
              await new Promise((resolve) => setTimeout(resolve, 35));
            } catch (err) {
              console.error('[Telegram Send Exception]', err);
              failed++;
            }
          }

          // Pause 60 seconds between chunks
          if (chunkIndex < chunks.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 60000));
          }
        }

        return { sent, failed };
      });

      totalSent += telegramResults.sent;
      totalFailed += telegramResults.failed;
    }

    // Step 5: Dispatch Email messages (batched via Resend)
    if (channelFilter.includes('email') && leadsByChannel.email.length > 0 && emailSubject) {
      const emailResults = await step.run('dispatch-email', async () => {
        const emailPayloads = leadsByChannel.email.map((lead: any) => ({
          to: lead.email,
          subject: replaceVariables(emailSubject, {
            customer_name: lead.lead_name || 'Customer',
          }),
          htmlBody: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              ${convertMarkdownToHtml(
                replaceVariables(messageTemplate, {
                  customer_name: lead.lead_name || 'Customer',
                })
              )}
              ${
                ctaButtonText && ctaLink
                  ? `<p style="text-align: center; margin-top: 30px;">
                       <a href="${ctaLink}" style="background: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                         ${ctaButtonText}
                       </a>
                     </p>`
                  : ''
              }
            </div>
          `,
        }));

        const result = await sendBatchEmails({ emails: emailPayloads });

        // Log each email delivery
        for (const email of leadsByChannel.email) {
          const wasSuccessful = !result.errors.some((e) => e.email === email.email);
          await db.rpc('mark_automation_step_completed', {
            p_automation_id: automationId,
            p_lead_id: email.lead_id,
            p_step_number: 1,
            p_channel: 'email',
            p_recipient: email.email,
            p_status: wasSuccessful ? 'sent' : 'failed',
          });
        }

        return { sent: result.sent, failed: result.failed };
      });

      totalSent += emailResults.sent;
      totalFailed += emailResults.failed;
    }

    // Step 6: Update automation last_executed_at
    await step.run('update-automation-timestamp', async () => {
      await db
        .from('workspace_automations')
        .update({ last_executed_at: new Date().toISOString() })
        .eq('id', automationId);
    });

    return {
      success: true,
      totalLeads: leads.length,
      sent: totalSent,
      failed: totalFailed,
    };
  }
);

/**
 * Utility: Chunk array into smaller arrays
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
