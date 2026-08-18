import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { inngest } from '@/inngest/client';
import { z } from 'zod';

const whatsappWebhookSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          value: z.object({
            messaging_product: z.string(),
            metadata: z.object({
              display_phone_number: z.string(),
              phone_number_id: z.string(),
            }),
            contacts: z.array(
              z.object({
                profile: z.object({ name: z.string() }),
                wa_id: z.string(),
              })
            ).optional(),
            messages: z.array(
              z.object({
                from: z.string(),
                id: z.string(),
                timestamp: z.string(),
                type: z.string(),
                text: z.object({ body: z.string() }).optional(),
              })
            ).optional(),
          }),
          field: z.string(),
        })
      ),
    })
  ),
});

// GET: Meta webhook verification handshake
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode !== 'subscribe' || !token || !challenge) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 403 });
  }

  // Verify token against any active WhatsApp integration
  const db = createServiceClient();
  const { data: integration } = await db
    .from('integrations')
    .select('id')
    .eq('platform', 'whatsapp')
    .eq('is_active', true)
    .eq('verify_secret', token)
    .limit(1)
    .single();

  if (!integration) {
    return NextResponse.json({ error: 'Token mismatch' }, { status: 403 });
  }

  return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

// POST: Incoming message webhook
export async function POST(request: Request) {
  const raw = await request.json();
  const parsed = whatsappWebhookSchema.safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  const payload = parsed.data;
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const messageData = value?.messages?.[0];

  // Only process text messages
  if (!messageData || messageData.type !== 'text' || !messageData.text?.body) {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  const phoneNumberId = value.metadata.phone_number_id;
  const senderPhone = messageData.from;
  const contactName = value.contacts?.[0]?.profile?.name ?? 'WhatsApp User';
  const messageText = messageData.text.body.trim();

  if (!messageText) {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // Identify tenant by matching phone_number_id against integrations
  const db = createServiceClient();
  const { data: integration } = await db
    .from('integrations')
    .select('id, tenant_id')
    .eq('platform', 'whatsapp')
    .eq('is_active', true)
    .eq('phone_number_id', phoneNumberId)
    .single();

  if (!integration) {
    console.error(`WhatsApp webhook: no matching integration for phone_number_id ${phoneNumberId}`);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // Dispatch to Inngest and return 200 immediately
  await inngest.send({
    name: 'chat/message.received',
    data: {
      tenantId: integration.tenant_id,
      platform: 'whatsapp',
      chatId: senderPhone,
      contactName,
      messageText,
      integrationId: integration.id,      externalMessageId: messageData.id,    },
  });

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
