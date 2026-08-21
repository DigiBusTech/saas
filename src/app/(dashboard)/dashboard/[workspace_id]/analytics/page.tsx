'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, MessageSquare, BarChart3 } from 'lucide-react';
import { getAnalyticsData } from './actions';

const COLORS = ['#10b981', '#6b7280', '#ef4444', '#f97316'];
const CHANNEL_COLORS: Record<string, string> = { telegram: '#0088cc', whatsapp: '#25d366', web: '#6366f1' };

export default function AnalyticsPage() {
  const params = useParams<{ workspace_id: string }>();
  const workspaceId = params.workspace_id;
  const [data, setData] = useState<any>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    getAnalyticsData(workspaceId, days).then(setData);
  }, [workspaceId, days]);

  if (!data) return <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>;

  const sentimentData = [
    { name: 'Positive', value: data.sentiment.positive, color: '#10b981' },
    { name: 'Neutral', value: data.sentiment.neutral, color: '#6b7280' },
    { name: 'Negative', value: data.sentiment.negative, color: '#ef4444' },
    { name: 'Angry', value: data.sentiment.angry, color: '#f97316' },
  ];

  const channelData = Object.entries(data.eventsByChannel).map(([channel, count]) => ({
    name: channel.charAt(0).toUpperCase() + channel.slice(1),
    value: count,
    color: CHANNEL_COLORS[channel] || '#6366f1',
  }));

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-indigo-500 dark:text-indigo-400" /><h1 className="text-xl font-semibold text-foreground">Analytics</h1></div>
          <div className="flex gap-2">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`text-xs px-3 py-1 rounded-lg ${
                  days === d ? 'bg-indigo-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Conversation insights, customer sentiment, and channel performance.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Inquiries', value: data.eventsByType['chat_inquiry'] || 0, color: 'from-blue-500 to-cyan-600' },
          { label: 'RAG Deflection', value: `${data.ragDeflectionRate}%`, color: 'from-purple-500 to-pink-600' },
          { label: 'Conversions', value: data.conversions, color: 'from-emerald-500 to-teal-600' },
          { label: 'Revenue', value: `$${(data.totalRevenue / 1000).toFixed(1)}k`, color: 'from-orange-500 to-yellow-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className={`rounded-xl bg-linear-to-br ${color} p-4 text-white shadow-lg`}>
            <p className="text-[10px] uppercase tracking-wider opacity-75">{label}</p>
            <p className="mt-2 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Inquiries Over Time */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Inquiries Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.eventsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} />
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Bar dataKey="inquiries" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment Breakdown */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Sentiment Index</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                {sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)' }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Channels Performance */}
        {channelData.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-sm font-semibold text-foreground mb-4">Inquiries by Channel</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={channelData} cx="50%" cy="50%" outerRadius={100} paddingAngle={2} dataKey="value">
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Event Types Breakdown */}
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Event Types</h2>
          <div className="space-y-2">
            {Object.entries(data.eventsByType)
              .sort(([, a], [, b]) => (b as number) - (a as number))
              .map(([type, count]) => (
                <div key={type} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize">{type.replace(/_/g, ' ')}</span>
                  <span className="font-semibold text-foreground">{count as number}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
