import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendInngestEvent } from '@/lib/inngest/dynamic';
import { decrypt } from '@/lib/encryption';
import { logTelemetry, normalizeError } from '@/lib/telemetry';
import { z } from 'zod';

const telegramUpdateSchema = z.object({
  update_id: z.number(),
  message: z.object({
    message_id: z.number(),
    from: z.object({
      id: z.number(),
      first_name: z.string().optional(),
      last_name: z.string().optional(),
    }).optional(),
    chat: z.object({ id: z.number() }),
    text: z.string().optional(),
  }).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspace_id: string }> }
) {
  const { workspace_id } = await params;

  // Parse incoming Telegram update
  const raw = await request.json();
  const parsed = telegramUpdateSchema.safeParse(raw);

  if (!parsed.success || !parsed.data.message?.text) {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  const message = parsed.data.message;
  const chatId = `tg_${message.chat.id}`;
  const contactName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') || 'Telegram User';
  const messageText = message.text!.trim();

  if (!messageText) {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // Look up workspace by ID and validate it has a Telegram bot token
  const db = createServiceClient();
  const { data: workspace } = await db
    .from('workspaces')
    .select('id, tenant_id, telegram_bot_token, telegram_webhook_secret, bot_persona, agent_mode, is_active')
    .eq('id', workspace_id)
    .eq('is_active', true)
    .single();

  if (!workspace || !workspace.telegram_bot_token) {
    console.error(`Telegram webhook: no active workspace or token for workspace_id ${workspace_id}`);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  const incomingSecret = request.headers.get('x-telegram-bot-api-secret-token');
  let webhookSecret: string;
  try { webhookSecret = decrypt(workspace.telegram_webhook_secret); } catch { webhookSecret = workspace.telegram_webhook_secret; }
  if (!incomingSecret || incomingSecret !== webhookSecret) {
    return NextResponse.json({ error: 'Unauthorized webhook' }, { status: 401 });
  }

  try {
    await sendInngestEvent({
      name: 'chat/message.received',
      data: {
        tenantId: workspace.tenant_id,
        workspaceId: workspace.id,
        platform: 'telegram' as const,
        chatId,
        contactName,
        messageText,
        integrationId: workspace.id,
        botPersona: workspace.bot_persona,
        agentMode: workspace.agent_mode,
        externalMessageId: `tg_${message.chat.id}_${message.message_id}`,
      },
    });
  } catch (error) {
    console.error('[telegram-webhook] Inngest dispatch failed:', error);
    const normalized = normalizeError(error);
    await logTelemetry({
      severity: 'error',
      source: 'webhook_telegram',
      endpoint: `/api/webhooks/telegram/${workspace_id}`,
      message: normalized.message,
      stackTrace: normalized.stack,
      workspaceId: workspace.id,
      tenantId: workspace.tenant_id,
      metadata: { phase: 'inngest_dispatch' },
    });
    return NextResponse.json({ error: 'Telegram received the message, but SabiBio could not queue it. Configure INNGEST_EVENT_KEY in Super Admin Configs.' }, { status: 503 });
  }

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
