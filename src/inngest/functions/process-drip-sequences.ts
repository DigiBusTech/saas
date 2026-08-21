import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/server-service';

/**
 * Drip Sequence Processor
 * 
 * Runs every 10 minutes to send scheduled drip messages.
 * Tracks progress per lead and advances to next step after successful send.
 */
export const processDripSequences = inngest.createFunction(
  { 
    id: 'process-drip-sequences',
    name: 'Process Drip Sequences',
  },
  { cron: '*/10 * * * *' }, // Every 10 minutes
  async ({ step, logger }) => {
    
    // Step 1: Fetch drip messages ready to send
    const messages = await step.run('fetch-ready-drip-messages', async () => {
      const supabase = createServiceClient();
      
      const { data, error } = await supabase.rpc('get_drip_messages_ready');
      
      if (error) {
        logger.error('Failed to fetch drip messages:', error);
        throw error;
      }

      logger.info(`Found ${data?.length || 0} drip messages ready to send`);
      return data || [];
    });

    if (!messages || messages.length === 0) {
      logger.info('No drip messages to process');
      return { processed: 0 };
    }

    // Step 2: Process each message
    let processedCount = 0;
    let failedCount = 0;
    
    for (const message of messages) {
      await step.run(`send-drip-${message.progress_id}`, async () => {
        const supabase = createServiceClient();
        
        try {
          // Get lead details
          const { data: lead, error: leadError } = await supabase
            .from('workspace_crm')
            .select('id, customer_name, phone, telegram_chat_id, email, preferred_channel')
            .eq('id', message.lead_id)
            .single();

          if (leadError || !lead) {
            logger.error(`Lead ${message.lead_id} not found:`, leadError);
            
            // Mark progress as failed
            await supabase.rpc('advance_drip_progress', {
              p_progress_id: message.progress_id,
              p_send_status: 'failed',
            });
            
            failedCount++;
            return;
          }

          // Determine channel to use
          let channel = lead.preferred_channel || 'whatsapp';
          const channels = message.channel_filter || ['whatsapp', 'telegram', 'email'];
          
          if (!channels.includes(channel)) {
            channel = channels[0]; // Fallback to first available channel
          }

          // Replace variables in message
          const personalizedMessage = message.message_template
            .replace(/{customer_name}/g, lead.customer_name || 'Customer')
            .replace(/{lead_email}/g, lead.email || '');

          let sendSuccess = false;

          // Send via appropriate channel
          if (channel === 'whatsapp' && lead.phone) {
            try {
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
                    type: message.media_url ? 'image' : 'text',
                    ...(message.media_url
                      ? {
                          image: {
                            link: message.media_url,
                            caption: personalizedMessage,
                          },
                        }
                      : {
                          text: { body: personalizedMessage },
                        }),
                  }),
                }
              );

              sendSuccess = response.ok;
              
              if (!sendSuccess) {
                const errorData = await response.json();
                logger.error(`WhatsApp send failed for drip ${message.progress_id}:`, errorData);
              }
            } catch (err) {
              logger.error(`WhatsApp exception for drip ${message.progress_id}:`, err);
            }
          } else if (channel === 'telegram' && lead.telegram_chat_id) {
            try {
              const telegramUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
              const response = await fetch(telegramUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: lead.telegram_chat_id,
                  text: personalizedMessage,
                  parse_mode: 'Markdown',
                }),
              });

              sendSuccess = response.ok;

              if (!sendSuccess) {
                logger.error(`Telegram send failed for drip ${message.progress_id}`);
              }
            } catch (err) {
              logger.error(`Telegram exception for drip ${message.progress_id}:`, err);
            }
          } else if (channel === 'email' && lead.email && message.email_subject) {
            try {
              // For drip sequences, we'll send individual emails
              const resend = process.env.RESEND_API_KEY ? await import('resend') : null;
              
              if (resend && process.env.RESEND_API_KEY) {
                const resendClient = new resend.Resend(process.env.RESEND_API_KEY);
                
                const htmlBody = `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    ${personalizedMessage.replace(/\n/g, '<br>')}
                    ${
                      message.cta_button_text && message.cta_link
                        ? `<p style="text-align: center; margin-top: 30px;">
                             <a href="${message.cta_link}" style="background: #06b6d4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                               ${message.cta_button_text}
                             </a>
                           </p>`
                        : ''
                    }
                  </div>
                `;

                const result = await resendClient.emails.send({
                  from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
                  to: lead.email,
                  subject: message.email_subject.replace(/{customer_name}/g, lead.customer_name || 'Customer'),
                  html: htmlBody,
                });

                sendSuccess = !result.error;

                if (!sendSuccess) {
                  logger.error(`Email send failed for drip ${message.progress_id}:`, result.error);
                }
              }
            } catch (err) {
              logger.error(`Email exception for drip ${message.progress_id}:`, err);
            }
          }

          // Log the attempt
          await supabase.rpc('mark_automation_step_completed', {
            p_automation_id: message.automation_id,
            p_lead_id: message.lead_id,
            p_step_number: message.step_number,
            p_channel: channel,
            p_recipient: channel === 'whatsapp' ? lead.phone : (channel === 'telegram' ? lead.telegram_chat_id : lead.email),
            p_status: sendSuccess ? 'sent' : 'failed',
          });

          // Advance to next step or retry
          await supabase.rpc('advance_drip_progress', {
            p_progress_id: message.progress_id,
            p_send_status: sendSuccess ? 'sent' : 'failed',
          });

          if (sendSuccess) {
            processedCount++;
            logger.info(`Successfully sent drip step ${message.step_number} to lead ${message.lead_id}`);
          } else {
            failedCount++;
          }

        } catch (error) {
          logger.error(`Error processing drip message ${message.progress_id}:`, error);
          
          // Mark as failed and retry later
          const supabase = createServiceClient();
          await supabase.rpc('advance_drip_progress', {
            p_progress_id: message.progress_id,
            p_send_status: 'failed',
          });
          
          failedCount++;
        }
      });
    }

    logger.info(`Processed ${processedCount} drip messages, ${failedCount} failed`);
    
    return { 
      processed: processedCount,
      failed: failedCount,
      total: messages.length
    };
  }
);
