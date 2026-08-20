import { inngest } from '../client';
import { createServiceClient } from '@/lib/supabase/server';
import { executeLLMRequest } from '@/lib/ai/router';
import { logTelemetry, normalizeError } from '@/lib/telemetry';

const STATUS_COPY: Record<string, string> = {
  pending_review: 'is pending review',
  approved: 'has been approved',
  rejected: 'could not be approved',
  paid: 'has been marked as paid',
  processing: 'is now being processed',
  shipped: 'has been shipped',
  completed: 'has been completed',
  cancelled: 'has been cancelled',
};

// order/status.updated — notifies a customer on their original channel
// (Telegram, WhatsApp, or the Unified Inbox for web) whenever an order's
// status changes, reusing the existing manual-send delivery functions and
// the Inbox's chat_messages Realtime subscription instead of a new channel.
export const orderStatusUpdated = inngest.createFunction(
  {
    id: 'order-status-updated',
    triggers: [{ event: 'order/status.updated' }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { orderId, newStatus } = event.data;
    if (!orderId || !newStatus) return { status: 'skipped', reason: 'missing_order_or_status' };

    const db = createServiceClient();

    try {
      const order = await step.run('load-order', async () => {
        const { data } = await db
          .from('workspace_orders')
          .select('id, workspace_id, order_code, status, channel, lead_id, customer_name, total, currency')
          .eq('id', orderId)
          .single();
        return data;
      });
      if (!order) return { status: 'skipped', reason: 'order_not_found' };

      const workspace = await step.run('load-workspace', async () => {
        const { data } = await db
          .from('workspaces')
          .select('id, bot_persona')
          .eq('id', order.workspace_id)
          .single();
        return data;
      });
      if (!workspace) return { status: 'skipped', reason: 'workspace_not_found' };

      const lead = order.lead_id
        ? await step.run('load-lead', async () => {
            const { data } = await db
              .from('workspace_crm')
              .select('id, platform, platform_user_id, phone_number')
              .eq('id', order.lead_id)
              .maybeSingle();
            return data;
          })
        : null;

      const message = await step.run('compose-message', async () => {
        const fallback = `Hi ${order.customer_name}, your order ${order.order_code} ${STATUS_COPY[newStatus] ?? `is now "${newStatus}"`}.`;
        try {
          const result = await executeLLMRequest({
            prompt: `Write a short, warm, professional 1-2 sentence order status update for a customer.\nCustomer name: ${order.customer_name}\nOrder code: ${order.order_code}\nNew status: ${newStatus}\nTotal: ${order.currency} ${order.total}`,
            systemInstruction: `You write brief order status notifications for a business's customers. Persona: ${workspace.bot_persona || 'Professional English'}. Keep it under 250 characters, no markdown.`,
            maxTokens: 120,
            temperature: 0.5,
          });
          return result.text?.trim() || fallback;
        } catch {
          return fallback;
        }
      });

      const channel: string | null = order.channel || lead?.platform || null;

      if (channel === 'telegram' && lead?.platform_user_id) {
        await step.run('dispatch-telegram', async () => {
          await inngest.send({ name: 'telegram.send_manual', data: { workspaceId: order.workspace_id, recipient: lead.platform_user_id, platformUserId: lead.platform_user_id, content: message } });
        });
      } else if (channel === 'whatsapp' && (lead?.phone_number || lead?.platform_user_id)) {
        await step.run('dispatch-whatsapp', async () => {
          await inngest.send({ name: 'whatsapp.send_manual', data: { workspaceId: order.workspace_id, recipient: lead?.phone_number || lead?.platform_user_id, content: message } });
        });
      }

      if (lead?.id) {
        await step.run('log-inbox-message', async () => {
          await db.from('chat_messages').insert({
            workspace_id: order.workspace_id,
            crm_id: lead.id,
            direction: 'outbound',
            sender_type: 'ai_agent',
            content: message,
            platform: channel || 'web',
          });
        });
      }

      if (['paid', 'completed', 'shipped'].includes(newStatus)) {
        await step.run('log-conversion', async () => {
          await db.from('workspace_analytics_events').insert({
            workspace_id: order.workspace_id,
            event_type: 'conversion',
            channel: channel || 'web',
            metadata: { order_code: order.order_code, status: newStatus },
          });
        });
      }

      return { status: 'sent', orderId: order.id, channel };
    } catch (error) {
      const normalized = normalizeError(error);
      await logTelemetry({
        severity: 'error',
        source: 'inngest_job',
        endpoint: 'order-status-updated',
        message: normalized.message,
        stackTrace: normalized.stack,
        metadata: { orderId, newStatus },
      });
      throw error;
    }
  }
);
