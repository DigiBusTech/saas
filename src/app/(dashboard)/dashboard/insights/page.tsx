'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface InsightsReport {
  summary: string;
  total_conversations: number;
  sentiment_breakdown: { positive: number; neutral: number; negative: number };
  top_topics: { topic: string; count: number; sentiment: string }[];
  unhandled_faqs: { question: string; frequency: number }[];
  lead_friction_points: { issue: string; severity: string }[];
  recommendations: string[];
}

const SENTIMENT_COLORS = { positive: '#10b981', neutral: '#6b7280', negative: '#ef4444' };

export default function InsightsPage() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [report, setReport] = useState<InsightsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    async function checkAccess() {
      try {
        const { createBrowserClient } = await import('@supabase/ssr');
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setHasAccess(false); setLoading(false); return; }

        const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
        if (!profile?.tenant_id) { setHasAccess(false); setLoading(false); return; }

        const { data: tenant } = await supabase.from('tenants').select('plan_id').eq('id', profile.tenant_id).single();

        if (tenant?.plan_id) {
          const { data: plan } = await supabase.from('subscription_plans').select('features').eq('id', tenant.plan_id).single();
          const features = plan?.features as Record<string, boolean> | null;
          setHasAccess(features?.ai_insights === true);
        } else {
          setHasAccess(false);
        }
      } catch {
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    }
    checkAccess();
  }, []);

  useEffect(() => {
    if (!hasAccess) return;
    fetch('/api/insights/report')
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.report) setReport(data.report as InsightsReport); })
      .catch(() => {});
  }, [hasAccess]);

  async function generateReport() {
    setGenerating(true);
    try {
      const { createBrowserClient } = await import('@supabase/ssr');
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
      if (!profile?.tenant_id) return;

      // Trigger the Inngest function via API
      const res = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: profile.tenant_id }),
      });

      if (res.ok) {
        await res.json();
        for (let attempt = 0; attempt < 12; attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const reportResponse = await fetch('/api/insights/report', { cache: 'no-store' });
          const reportData = reportResponse.ok ? await reportResponse.json() : null;
          if (reportData?.report) {
            setReport(reportData.report as InsightsReport);
            break;
          }
        }
      }
    } catch (err) {
      console.error('Failed to generate insights:', err);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-500 text-sm">Loading...</div>;
  }

  // PAYWALL: if ai_insights is false, show upgrade upsell
  if (!hasAccess) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-6">
        <div className="w-16 h-16 mx-auto bg-indigo-950/40 border border-indigo-900/30 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">AI Business Insights</h2>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          Unlock powerful AI-driven analytics about your customer conversations. Get insights on sentiment, unhandled FAQs, lead friction points, and actionable recommendations.
        </p>
        <div className="bg-[#0F1219] border border-gray-800 rounded-lg p-6 max-w-sm mx-auto text-left space-y-3">
          <p className="text-xs text-gray-500 uppercase font-bold">Included in Pro & Unlimited plans:</p>
          <ul className="text-xs text-gray-400 space-y-2">
            <li>✓ Customer sentiment analysis</li>
            <li>✓ Unhandled FAQ detection</li>
            <li>✓ Lead friction point identification</li>
            <li>✓ AI-powered recommendations</li>
            <li>✓ Visual reports with charts</li>
          </ul>
        </div>
        <a
          href="/dashboard/billing"
          className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg transition"
        >
          Upgrade Your Plan →
        </a>
      </div>
    );
  }

  // INSIGHTS DASHBOARD
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">AI Business Insights</h2>
          <p className="text-xs text-gray-500 mt-1">AI-powered analysis of your customer conversations.</p>
        </div>
        <button
          onClick={generateReport}
          disabled={generating}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition"
        >
          {generating ? 'Generating...' : '🔄 Generate New Report'}
        </button>
      </div>

      {!report ? (
        <div className="bg-[#0F1219] border border-gray-800 rounded-lg p-12 text-center">
          <p className="text-sm text-gray-400 mb-4">No report generated yet. Click the button above to analyze your conversations.</p>
          <button
            onClick={generateReport}
            disabled={generating}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-bold rounded-lg transition"
          >
            {generating ? 'Analyzing conversations...' : 'Generate First Report'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-[#0F1219] border border-gray-800 rounded-lg p-5">
            <h3 className="text-sm font-bold text-white mb-2">Summary</h3>
            <p className="text-xs text-gray-400 leading-relaxed">{report.summary}</p>
            <p className="text-[10px] text-gray-500 mt-2">Based on {report.total_conversations} conversations</p>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sentiment Pie */}
            <div className="bg-[#0F1219] border border-gray-800 rounded-lg p-5">
              <h3 className="text-sm font-bold text-white mb-4">Customer Sentiment</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Positive', value: report.sentiment_breakdown.positive },
                      { name: 'Neutral', value: report.sentiment_breakdown.neutral },
                      { name: 'Negative', value: report.sentiment_breakdown.negative },
                    ]}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value"
                  >
                    <Cell fill={SENTIMENT_COLORS.positive} />
                    <Cell fill={SENTIMENT_COLORS.neutral} />
                    <Cell fill={SENTIMENT_COLORS.negative} />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-2">
                {Object.entries(report.sentiment_breakdown).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-1.5 text-[10px]">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SENTIMENT_COLORS[key as keyof typeof SENTIMENT_COLORS] }} />
                    <span className="text-gray-400 capitalize">{key}: {val}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Topics Bar */}
            <div className="bg-[#0F1219] border border-gray-800 rounded-lg p-5">
              <h3 className="text-sm font-bold text-white mb-4">Top Conversation Topics</h3>
              {report.top_topics.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={report.top_topics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="topic" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs text-gray-500 text-center py-8">No topic data available</p>
              )}
            </div>
          </div>

          {/* Unhandled FAQs */}
          {report.unhandled_faqs.length > 0 && (
            <div className="bg-[#0F1219] border border-gray-800 rounded-lg p-5">
              <h3 className="text-sm font-bold text-white mb-3">Unhandled FAQs</h3>
              <div className="space-y-2">
                {report.unhandled_faqs.map((faq, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-900/50 rounded p-3">
                    <span className="text-xs text-gray-300">{faq.question}</span>
                    <span className="text-[10px] text-amber-400 font-mono">{faq.frequency}x</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friction Points */}
          {report.lead_friction_points.length > 0 && (
            <div className="bg-[#0F1219] border border-gray-800 rounded-lg p-5">
              <h3 className="text-sm font-bold text-white mb-3">Lead Friction Points</h3>
              <div className="space-y-2">
                {report.lead_friction_points.map((fp, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-900/50 rounded p-3">
                    <span className="text-xs text-gray-300">{fp.issue}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                      fp.severity === 'high' ? 'bg-rose-950/40 text-rose-400 border border-rose-900/30'
                        : fp.severity === 'medium' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30'
                        : 'bg-gray-900 text-gray-500 border border-gray-800'
                    }`}>{fp.severity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="bg-[#0F1219] border border-indigo-900/30 rounded-lg p-5">
              <h3 className="text-sm font-bold text-white mb-3">💡 AI Recommendations</h3>
              <ul className="space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="text-xs text-gray-300 flex gap-2">
                    <span className="text-indigo-400 font-bold">{i + 1}.</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
