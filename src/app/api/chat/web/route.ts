import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { sendInngestEvent } from '@/lib/inngest/dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');
  const sessionId = searchParams.get('sessionId');
  const since = searchParams.get('since');
  if (!workspaceId || !sessionId) return NextResponse.json({ error: 'Missing chat identity' }, { status: 400 });

  const db = createServiceClient();
  const { data: conversation } = await db
    .from('conversations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'web')
    .eq('platform_chat_id', `web_${sessionId}`)
    .maybeSingle();
  if (!conversation) return NextResponse.json({ status: 'pending' });

  const query = db
    .from('messages')
    .select('content, created_at')
    .eq('conversation_id', conversation.id)
    .eq('sender_type', 'bot')
    .order('created_at', { ascending: false })
    .limit(1);
  const { data: reply } = since ? await query.gt('created_at', since).maybeSingle() : await query.maybeSingle();
  return reply ? NextResponse.json({ status: 'complete', reply: reply.content, createdAt: reply.created_at }) : NextResponse.json({ status: 'pending' });
}

const requestSchema = z.object({
  workspaceId: z.string().uuid(),
  sessionId: z.string().min(12).max(100),
  content: z.string().trim().min(1).max(4000),
  visitorName: z.string().trim().min(2).max(120),
  visitorEmail: z.string().email(),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: 'Invalid chat request' }, { status: 400 });

  const { workspaceId, sessionId, content, visitorName, visitorEmail } = parsed.data;
  const db = createServiceClient();
  const { data: workspace } = await db
    .from('workspaces')
    .select('id, tenant_id, name, bot_persona, agent_mode, sabibio_channels, is_active')
    .eq('id', workspaceId)
    .eq('is_active', true)
    .single();

  if (!workspace) return NextResponse.json({ error: 'Workspace not found' }, { status: 404 });
  const channels = (workspace.sabibio_channels ?? {}) as Record<string, unknown>;
  if (channels.web_chat_enabled === false) return NextResponse.json({ error: 'Web chat is not enabled' }, { status: 403 });

  const chatId = `web_${sessionId}`;
  const externalMessageId = `web_${sessionId}_${crypto.randomUUID()}`;
  const requestStartedAt = new Date().toISOString();
  try {
    await sendInngestEvent({
      name: 'chat/message.received',
      data: {
        tenantId: workspace.tenant_id,
        workspaceId: workspace.id,
        platform: 'web',
        chatId,
        contactName: visitorName,
        visitorEmail,
        messageText: content,
        integrationId: null,
        botPersona: workspace.bot_persona,
        agentMode: workspace.agent_mode,
        externalMessageId,
      },
    });
  } catch (error) {
    console.error('[web-chat] Inngest dispatch failed:', error);
    return NextResponse.json({ error: 'Web chat is not connected. Configure the Inngest event key and run migration_016_web_chat.sql.' }, { status: 503 });
  }

  // Give the background job a short window to return an answer for the drawer.
  // If it takes longer, the drawer still receives a graceful queued response.
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const { data: conversation } = await db
      .from('conversations')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('platform', 'web')
      .eq('platform_chat_id', chatId)
      .maybeSingle();
    if (!conversation) continue;
    const { data: reply } = await db
      .from('messages')
      .select('content, created_at')
      .eq('conversation_id', conversation.id)
      .eq('sender_type', 'bot')
      .gt('created_at', requestStartedAt)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (reply) return NextResponse.json({ reply: reply.content, since: requestStartedAt });
  }

  const queuedReply = workspace.agent_mode === 'copilot'
    ? 'Thank you for reaching out. We have received your message and our team is reviewing the best response. Please stay with us; we will be right back.'
    : 'Thank you for reaching out. We have received your message and our assistant is preparing a helpful response. Please stay with us; we will be right back.';
  return NextResponse.json({ reply: queuedReply, since: requestStartedAt, queued: true });
}
