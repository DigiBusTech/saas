import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { sendInngestEvent } from '@/lib/inngest/dynamic';
import { logTelemetry } from '@/lib/telemetry';

// Public route embedded on arbitrary third-party sites via public/widget.js —
// CORS must be permissive since we don't maintain a tenant domain allow-list.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function withCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) response.headers.set(key, value);
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get('workspaceId');
  const sessionId = searchParams.get('sessionId');
  const since = searchParams.get('since');
  if (!workspaceId || !sessionId) return withCors(NextResponse.json({ error: 'Missing chat identity' }, { status: 400 }));

  const db = createServiceClient();
  const { data: conversation } = await db
    .from('conversations')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('platform', 'web')
    .eq('platform_chat_id', `web_${sessionId}`)
    .maybeSingle();
  if (!conversation) return withCors(NextResponse.json({ status: 'pending' }));

  const query = db
    .from('messages')
    .select('content, created_at')
    .eq('conversation_id', conversation.id)
    .eq('sender_type', 'bot')
    .order('created_at', { ascending: false })
    .limit(1);
  const { data: reply } = since ? await query.gt('created_at', since).maybeSingle() : await query.maybeSingle();
  return withCors(reply ? NextResponse.json({ status: 'complete', reply: reply.content, createdAt: reply.created_at }) : NextResponse.json({ status: 'pending' }));
}

const requestSchema = z.object({
  workspaceId: z.string().uuid(),
  sessionId: z.string().min(12).max(100),
  content: z.string().trim().min(1).max(4000),
  visitorName: z.string().trim().min(2).max(120),
  visitorEmail: z.string().email(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withCors(NextResponse.json({ error: 'Invalid request body' }, { status: 400 }));
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return withCors(NextResponse.json({ error: 'Invalid chat request' }, { status: 400 }));

  const { workspaceId, sessionId, content, visitorName, visitorEmail } = parsed.data;
  const db = createServiceClient();
  const { data: workspace } = await db
    .from('workspaces')
    .select('id, tenant_id, name, bot_persona, agent_mode, sabibio_channels, is_active')
    .eq('id', workspaceId)
    .eq('is_active', true)
    .single();

  if (!workspace) return withCors(NextResponse.json({ error: 'Workspace not found' }, { status: 404 }));
  const channels = (workspace.sabibio_channels ?? {}) as Record<string, unknown>;
  if (channels.web_chat_enabled === false) return withCors(NextResponse.json({ error: 'Web chat is not enabled' }, { status: 403 }));

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
    await logTelemetry({
      severity: 'error',
      source: 'api',
      endpoint: '/api/chat/web',
      message: error instanceof Error ? error.message : 'Inngest dispatch failed',
      workspaceId,
      tenantId: workspace.tenant_id,
    });
    return withCors(NextResponse.json({ error: 'Web chat is not connected. Configure the Inngest event key and run migration_016_web_chat.sql.' }, { status: 503 }));
  }

  // Give the background job a brief window to answer inline. The client
  // polls the GET endpoint for the rest — this must stay well under the
  // platform's serverless function timeout (Vercel Hobby caps at 10s).
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 400));
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
    if (reply) return withCors(NextResponse.json({ reply: reply.content, since: requestStartedAt }));
  }

  const queuedReply = workspace.agent_mode === 'copilot'
    ? 'Thank you for reaching out. We have received your message and our team is reviewing the best response. Please stay with us; we will be right back.'
    : 'Thank you for reaching out. We have received your message and our assistant is preparing a helpful response. Please stay with us; we will be right back.';
  return withCors(NextResponse.json({ reply: queuedReply, since: requestStartedAt, queued: true }));
}

