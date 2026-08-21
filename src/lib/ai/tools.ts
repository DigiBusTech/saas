import type { createServiceClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

type ServiceClient = ReturnType<typeof createServiceClient>;

export const CHAT_TOOL_DEFINITIONS: Array<Record<string, unknown>> = [
  {
    type: 'function',
    function: {
      name: 'check_order_status',
      description: "Look up the live status of a customer's order using their order code.",
      parameters: {
        type: 'object',
        properties: {
          order_code: { type: 'string', description: 'The order code the customer provided, e.g. ORD-9482A.' },
        },
        required: ['order_code'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_products_and_services',
      description: "Search this business's active products and services catalog.",
      parameters: {
        type: 'object',
        properties: {
          search_query: { type: 'string', description: 'Keywords describing what the customer is looking for.' },
          category: { type: 'string', description: 'Optional category or type hint.' },
        },
        required: ['search_query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_human',
      description: 'Hand the conversation off to a human team member. Use for complaints, anger, disputes, or anything you cannot confidently resolve.',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why this conversation needs a human.' },
          priority_level: { type: 'string', enum: ['low', 'medium', 'high'] },
        },
        required: ['reason'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_purchase_intent',
      description: 'Record that the customer showed clear intent to buy a product or book a service, and draft a pending order.',
      parameters: {
        type: 'object',
        properties: {
          item_code: { type: 'string', description: 'The product or service code, e.g. PRD-101 or SRV-882.' },
          order_type: { type: 'string', enum: ['product', 'service'], description: 'Whether this is a physical product purchase or service booking.' },
          service_date: { type: 'string', description: 'For service bookings: preferred appointment date/time in ISO format.' },
          booking_notes: { type: 'string', description: 'For service bookings: any special requests or notes from the customer.' },
        },
        required: ['item_code', 'order_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_lead_profile',
      description: 'Update the customer\'s name and email in the CRM. Use this when the customer provides missing identity information.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Customer\'s full name.' },
          email: { type: 'string', description: 'Customer\'s email address.' },
          phone: { type: 'string', description: 'Customer\'s phone number (optional).' },
        },
        required: [],
      },
    },
  },
];

export interface ChatToolContext {
  db: ServiceClient;
  workspaceId: string;
  tenantId: string;
  platform: 'telegram' | 'whatsapp' | 'web';
  chatId: string;
  contactName: string;
  conversationId: string;
  crmId: string | null;
}

function generateOrderCode(): string {
  return `ORD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

async function logAnalyticsEvent(ctx: ChatToolContext, eventType: string, metadata: Record<string, unknown>) {
  try {
    await ctx.db.from('workspace_analytics_events').insert({
      workspace_id: ctx.workspaceId,
      event_type: eventType,
      channel: ctx.platform,
      metadata,
    });
  } catch {
    // Analytics logging must never break the chat pipeline.
  }
}

/**
 * Executes one agent tool call and returns a JSON-serializable result.
 * Never throws — failures are returned as { error } so the LLM can react
 * gracefully instead of the Inngest step crashing.
 */
export async function executeChatTool(
  name: string,
  argsJson: string,
  ctx: ChatToolContext
): Promise<Record<string, unknown>> {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(argsJson || '{}');
  } catch {
    // Malformed tool arguments from the model; proceed with an empty object.
  }

  try {
    switch (name) {
      case 'check_order_status': {
        const orderCode = String(args.order_code ?? '').trim();
        if (!orderCode) return { error: 'No order code provided.' };

        const { data: order } = await ctx.db
          .from('workspace_orders')
          .select('id, order_code, status, total, currency, created_at')
          .eq('workspace_id', ctx.workspaceId)
          .ilike('order_code', orderCode)
          .maybeSingle();
        if (!order) return { found: false, message: 'No order found with that code.' };

        const { data: items } = await ctx.db
          .from('workspace_order_items')
          .select('title, quantity, unit_price, currency')
          .eq('order_id', order.id);

        await logAnalyticsEvent(ctx, 'order_status_check', { order_code: order.order_code });
        return {
          found: true,
          order_code: order.order_code,
          status: order.status,
          total: order.total,
          currency: order.currency,
          placed_at: order.created_at,
          items: items ?? [],
        };
      }

      case 'get_products_and_services': {
        const searchQuery = String(args.search_query ?? args.category ?? '').trim();
        const pattern = searchQuery ? `%${searchQuery}%` : '%';

        const [{ data: products }, { data: services }] = await Promise.all([
          ctx.db
            .from('workspace_products')
            .select('code, name, price, currency, checkout_url')
            .eq('workspace_id', ctx.workspaceId)
            .eq('is_active', true)
            .or(`name.ilike.${pattern},description.ilike.${pattern}`)
            .limit(5),
          ctx.db
            .from('workspace_services')
            .select('code, name, price, currency, checkout_url')
            .eq('workspace_id', ctx.workspaceId)
            .eq('is_active', true)
            .or(`name.ilike.${pattern},description.ilike.${pattern}`)
            .limit(5),
        ]);

        const results = [
          ...(products ?? []).map((p) => ({ ...p, type: 'product' as const })),
          ...(services ?? []).map((s) => ({ ...s, type: 'service' as const })),
        ].map((item) => ({
          code: item.code,
          name: item.name,
          price: item.price,
          currency: item.currency,
          type: item.type,
          purchase_link: item.checkout_url || (item.code ? `https://sabibio.link/checkout?item=${encodeURIComponent(item.code)}` : null),
        }));

        return { count: results.length, results };
      }

      case 'escalate_to_human': {
        const reason = String(args.reason ?? 'Customer requested human assistance.');
        const priority = String(args.priority_level ?? 'medium');

        await ctx.db.from('conversations').update({ status: 'human_handoff' }).eq('id', ctx.conversationId);
        if (ctx.crmId) await ctx.db.from('workspace_crm').update({ ai_status: 'paused' }).eq('id', ctx.crmId);

        const { data: owner } = await ctx.db
          .from('users')
          .select('email, full_name')
          .eq('tenant_id', ctx.tenantId)
          .in('role', ['tenant_admin', 'super_admin'])
          .limit(1)
          .maybeSingle();
        if (owner?.email) {
          await sendEmail('human_handoff_alert', owner.email, {
            tenant_name: owner.full_name ?? 'Tenant team',
            customer_name: ctx.contactName,
            message: reason,
          });
        }

        await logAnalyticsEvent(ctx, 'escalation', { reason, priority });
        return { escalated: true, message: 'A human team member has been notified and will follow up shortly.' };
      }

      case 'log_purchase_intent': {
        const itemCode = String(args.item_code ?? '').trim();
        const orderType = String(args.order_type ?? 'product').trim() as 'product' | 'service';
        const serviceDate = args.service_date ? String(args.service_date) : null;
        const bookingNotes = args.booking_notes ? String(args.booking_notes) : null;

        await logAnalyticsEvent(ctx, 'purchase_intent', { item_code: itemCode || null, order_type: orderType });
        if (!itemCode) return { logged: true, order_created: false };

        const [{ data: product }, { data: service }] = await Promise.all([
          ctx.db.from('workspace_products').select('id, code, name, price, currency').eq('workspace_id', ctx.workspaceId).eq('code', itemCode).maybeSingle(),
          ctx.db.from('workspace_services').select('id, code, name, price, currency').eq('workspace_id', ctx.workspaceId).eq('code', itemCode).maybeSingle(),
        ]);
        const item = product ?? service;
        if (!item) return { logged: true, order_created: false, message: 'Item code not found.' };

        let customerEmail = '';
        if (ctx.crmId) {
          const { data: crm } = await ctx.db.from('workspace_crm').select('email').eq('id', ctx.crmId).maybeSingle();
          customerEmail = crm?.email ?? '';
        }

        const orderCode = generateOrderCode();
        const insertPayload: any = {
          workspace_id: ctx.workspaceId,
          customer_name: ctx.contactName,
          customer_email: customerEmail,
          payment_method: 'pending',
          status: 'pending_review',
          total: item.price ?? 0,
          currency: item.currency ?? 'USD',
          order_code: orderCode,
          channel: ctx.platform,
          lead_id: ctx.crmId,
          updated_by: 'ai',
          order_type: orderType,
        };

        // Add service-specific fields
        if (orderType === 'service') {
          insertPayload.service_date = serviceDate;
          insertPayload.booking_notes = bookingNotes;
          insertPayload.service_status = 'inquiry';
        }

        const { data: order, error } = await ctx.db
          .from('workspace_orders')
          .insert(insertPayload)
          .select('id')
          .single();
        if (error || !order) return { logged: true, order_created: false, message: 'Could not draft the order automatically.' };

        await ctx.db.from('workspace_order_items').insert({
          order_id: order.id,
          item_type: product ? 'product' : 'service',
          item_id: item.id,
          title: item.name,
          quantity: 1,
          unit_price: item.price ?? 0,
          currency: item.currency ?? 'USD',
        });

        return { 
          logged: true, 
          order_created: true, 
          order_code: orderCode,
          order_type: orderType,
          ...(orderType === 'service' && serviceDate ? { scheduled_date: serviceDate } : {}),
        };
      }

      case 'update_lead_profile': {
        if (!ctx.crmId) return { updated: false, message: 'No CRM record found for this conversation.' };

        const updatePayload: any = {};
        if (args.name && String(args.name).trim()) updatePayload.customer_name = String(args.name).trim();
        if (args.email && String(args.email).trim()) updatePayload.email = String(args.email).trim();
        if (args.phone && String(args.phone).trim()) updatePayload.phone_number = String(args.phone).trim();

        if (Object.keys(updatePayload).length === 0) {
          return { updated: false, message: 'No valid profile data provided.' };
        }

        const { error } = await ctx.db
          .from('workspace_crm')
          .update(updatePayload)
          .eq('id', ctx.crmId);

        if (error) return { updated: false, message: 'Failed to update profile.' };

        await logAnalyticsEvent(ctx, 'lead_profile_updated', updatePayload);
        return { updated: true, message: 'Customer profile updated successfully.' };
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Tool execution failed.' };
  }
}
