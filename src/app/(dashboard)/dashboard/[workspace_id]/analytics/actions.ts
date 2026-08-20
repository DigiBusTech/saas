'use server';

import { createClient } from '@/lib/supabase/server';

export async function getAnalyticsData(workspaceId: string, days: number = 30) {
  const db = await createClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: events }, { data: reputationLogs }, { data: orders }] = await Promise.all([
    db.from('workspace_analytics_events').select('*').eq('workspace_id', workspaceId).gte('created_at', since),
    db.from('workspace_reputation_logs').select('*').eq('workspace_id', workspaceId).gte('created_at', since),
    db.from('workspace_orders').select('status, channel, total').eq('workspace_id', workspaceId).gte('created_at', since),
  ]);

  const eventsByType: Record<string, number> = {};
  const eventsByChannel: Record<string, number> = {};
  const eventsByDay: Record<string, number> = {};

  for (const e of events ?? []) {
    eventsByType[e.event_type] = (eventsByType[e.event_type] || 0) + 1;
    eventsByChannel[e.channel] = (eventsByChannel[e.channel] || 0) + 1;
    const day = new Date(e.created_at).toISOString().split('T')[0];
    eventsByDay[day] = (eventsByDay[day] || 0) + 1;
  }

  const sentiment = { positive: 0, neutral: 0, negative: 0, angry: 0 };
  for (const log of reputationLogs ?? []) {
    sentiment[log.sentiment_label as keyof typeof sentiment]++;
  }

  const conversions = (orders ?? []).filter((o) => ['paid', 'completed'].includes(o.status)).length;
  const totalRevenue = (orders ?? []).reduce((sum, o) => sum + (o.total ?? 0), 0);
  const ragDeflectionRate = eventsByType['rag_deflection'] && eventsByType['chat_inquiry']
    ? ((eventsByType['rag_deflection'] / eventsByType['chat_inquiry']) * 100).toFixed(1)
    : '0';

  return {
    eventsByType,
    eventsByChannel,
    eventsByDay: Object.entries(eventsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({ date, inquiries: count })),
    sentiment,
    conversions,
    totalRevenue,
    ragDeflectionRate,
  };
}
