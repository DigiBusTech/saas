import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';

// Public analytics endpoint - CORS enabled for embeddable tracking
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function withCors(response: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(CORS_HEADERS)) response.headers.set(key, value);
  return response;
}

export async function OPTIONS() {
  return withCors(new NextResponse(null, { status: 204 }));
}

const analyticsSchema = z.object({
  workspaceId: z.string().uuid(),
  eventType: z.enum(['page_view', 'link_click', 'product_view', 'service_view', 'channel_click', 'form_submit']),
  eventData: z.record(z.unknown()).optional(),
  sessionId: z.string().optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withCors(NextResponse.json({ error: 'Invalid request body' }, { status: 400 }));
  }

  const parsed = analyticsSchema.safeParse(body);
  if (!parsed.success) {
    return withCors(NextResponse.json({ error: 'Invalid analytics event' }, { status: 400 }));
  }

  const { workspaceId, eventType, eventData, sessionId } = parsed.data;

  // Extract visitor metadata from request
  const ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const referrer = request.headers.get('referer') || request.headers.get('referrer') || null;

  const db = createServiceClient();

  // Verify workspace exists and get tenant_id
  const { data: workspace } = await db
    .from('workspaces')
    .select('id, tenant_id, is_active')
    .eq('id', workspaceId)
    .eq('is_active', true)
    .single();

  if (!workspace) {
    return withCors(NextResponse.json({ error: 'Workspace not found' }, { status: 404 }));
  }

  // Record analytics event
  const { error } = await db.from('workspace_analytics').insert({
    workspace_id: workspaceId,
    tenant_id: workspace.tenant_id,
    event_type: eventType,
    event_data: eventData || {},
    visitor_session_id: sessionId,
    visitor_ip: ipAddress,
    user_agent: userAgent,
    referrer,
  });

  if (error) {
    console.error('[analytics] Failed to record event:', error);
    return withCors(NextResponse.json({ error: 'Failed to record event' }, { status: 500 }));
  }

  return withCors(NextResponse.json({ success: true }));
}
