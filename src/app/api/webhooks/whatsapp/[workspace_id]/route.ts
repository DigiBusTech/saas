import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { inngest } from '@/inngest/client';
import { decrypt } from '@/lib/encryption';
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

// GET: Meta webhook verification handshake (workspace-scoped)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspace_id: string }> }
) {
  const { workspace_id } = await params;
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode !== 'subscribe' || !token || !challenge) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 403 });
  }

  // Verify token against this specific workspace's stored verify token
  const db = createServiceClient();
  const { data: workspace } = await db
    .from('workspaces')
    .select('id, whatsapp_verify_token')
    .eq('id', workspace_id)
    .eq('is_active', true)
    .single();

  if (!workspace || !workspace.whatsapp_verify_token) {
    return NextResponse.json({ error: 'Workspace not found' }, { status: 403 });
  }

  // Decrypt stored verify token and compare
  let storedToken: string;
  try {
    storedToken = decrypt(workspace.whatsapp_verify_token);
  } catch {
    // Might not be encrypted (legacy or plaintext)
    storedToken = workspace.whatsapp_verify_token;
  }

  if (storedToken !== token) {
    return NextResponse.json({ error: 'Token mismatch' }, { status: 403 });
  }

  return new Response(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } });
}

// POST: Incoming message webhook (workspace-scoped)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ workspace_id: string }> }
) {
  const { workspace_id } = await params;

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

  const senderPhone = messageData.from;
  const contactName = value.contacts?.[0]?.profile?.name ?? 'WhatsApp User';
  const messageText = messageData.text.body.trim();
  const incomingPhoneNumberId = value.metadata.phone_number_id;

  if (!messageText) {
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // Look up workspace by ID
  const db = createServiceClient();
  const { data: workspace } = await db
    .from('workspaces')
    .select('id, tenant_id, whatsapp_phone_number_id, whatsapp_access_token, bot_persona, agent_mode, is_active')
    .eq('id', workspace_id)
    .eq('is_active', true)
    .single();

  if (!workspace || !workspace.whatsapp_access_token) {
    console.error(`WhatsApp webhook: no active workspace or credentials for workspace_id ${workspace_id}`);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // Verify the inbound phone_number_id actually belongs to this workspace to
  // prevent a message meant for a different tenant being routed here.
  let storedPhoneNumberId: string;
  try { storedPhoneNumberId = decrypt(workspace.whatsapp_phone_number_id ?? ''); } catch { storedPhoneNumberId = workspace.whatsapp_phone_number_id ?? ''; }
  if (!storedPhoneNumberId || storedPhoneNumberId !== incomingPhoneNumberId) {
    console.error(`WhatsApp webhook: phone_number_id mismatch for workspace_id ${workspace_id}`);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  }

  // Dispatch to Inngest with workspace context
  await inngest.send({
    name: 'chat/message.received',
    data: {
      tenantId: workspace.tenant_id,
      workspaceId: workspace.id,
      platform: 'whatsapp' as const,
      chatId: senderPhone,
      contactName,
      messageText,
      integrationId: workspace.id, // workspace acts as integration source
      botPersona: workspace.bot_persona,
      agentMode: workspace.agent_mode,
      externalMessageId: messageData.id,
    },
  });

  return NextResponse.json({ status: 'ok' }, { status: 200 });
}
