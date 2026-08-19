import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { sendInngestEvent } from '@/lib/inngest/dynamic';
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

export async function POST(request: Request) {
  // Immediately parse and validate
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

  // Verify the secret token from Telegram
  const incomingSecret = request.headers.get('x-telegram-bot-api-secret-token') ?? '';

  // Identify tenant by matching the secret token against integrations table
  const db = createServiceClient();
  const { data: integration } = await db
    .from('integrations')
    .select('id, tenant_id, verify_secret')
    .eq('platform', 'telegram')
    .eq('is_active', true)
    .eq('verify_secret', incomingSecret)
    .single();

  if (!integration) {
    console.error('Telegram webhook: no matching active integration for secret');
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // Dispatch to Inngest and return 200 immediately
  await sendInngestEvent({
    name: 'chat/message.received',
    data: {
      tenantId: integration.tenant_id,
      platform: 'telegram',
      chatId,
      contactName,
      messageText,
      integrationId: integration.id,
      externalMessageId: `tg_${message.chat.id}_${message.message_id}`,
    },
  });

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
