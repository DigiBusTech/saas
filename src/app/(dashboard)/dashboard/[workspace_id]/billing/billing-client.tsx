'use client';

import { useState } from 'react';
import { AlertTriangle, TrendingUp, Database, Users, Zap, CreditCard } from 'lucide-react';
import Link from 'next/link';

interface Workspace {
  id: string;
  name: string;
  subscription_tier: string;
  trial_ends_at: string | null;
  is_trial_claimed: boolean;
  message_limit: number;
  messages_used: number;
  knowledge_doc_limit: number;
  knowledge_docs_used: number;
  crm_lead_limit: number;
  crm_leads_used: number;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  price_usd: number;
  price_ngn: number;
  ai_message_cap: number;
  knowledge_doc_cap: number;
  crm_lead_cap: number;
  has_whatsapp: boolean;
  has_telegram: boolean;
  features: Record<string, boolean>;
}

interface Props {
  workspace: Workspace;
  currentPlan: Plan | null;
  availablePlans: Plan[];
}

export function WorkspaceBillingClient({ workspace, currentPlan, availablePlans }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'USD' | 'NGN'>('USD');

  const isFreeTrial = workspace.subscription_tier === 'free_trial';
  const trialEndsAt = workspace.trial_ends_at ? new Date(workspace.trial_ends_at) : null;
  const now = new Date();
  const trialExpired = trialEndsAt && trialEndsAt < now;
  const daysRemaining = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const messageUsagePercent = (workspace.messages_used / workspace.message_limit) * 100;
  const knowledgeUsagePercent = (workspace.knowledge_docs_used / workspace.knowledge_doc_limit) * 100;
  const crmUsagePercent = (workspace.crm_leads_used / workspace.crm_lead_limit) * 100;

  async function handleUpgrade(planSlug: string) {
    setLoading(planSlug);
    try {
      const res = await fetch('/api/checkout/flutterwave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan: planSlug, 
          setupFee: false,
          currency: currency
        }),
      });

      const data = await res.json();

      if (data.config) {
        // @ts-expect-error — FlutterwaveCheckout loaded from CDN script
        if (typeof window.FlutterwaveCheckout === 'function') {
          // @ts-expect-error
          window.FlutterwaveCheckout(data.config);
        } else {
          window.location.href = `https://checkout.flutterwave.com/v3/hosted/pay/${data.config.tx_ref}`;
        }
      } else {
        console.error('Checkout error:', data.error);
      }
    } catch (err) {
      console.error('Checkout request failed:', err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Trial Status Banner */}
      {isFreeTrial && !trialExpired && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-amber-400">14-Day Free Trial Active</h3>
              <p className="text-xs text-muted-foreground mt-1">
                You have <strong className="text-amber-400">{daysRemaining} days</strong> remaining in your free trial.
                You've used <strong>{workspace.messages_used}/{workspace.message_limit}</strong> AI messages.
              </p>
              <Link
                href="#upgrade"
                className="mt-3 inline-flex items-center gap-2 rounded bg-amber-500 px-3 py-1.5 text-xs font-bold text-black transition hover:bg-amber-400"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Upgrade Now
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Trial Expired Banner */}
      {isFreeTrial && trialExpired && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-rose-400">Trial Expired</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your 14-day free trial has ended. Your AI assistant is currently offline.
                Upgrade to a paid plan to resume service.
              </p>
              <Link
                href="#upgrade"
                className="mt-3 inline-flex items-center gap-2 rounded bg-rose-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-rose-400"
              >
                <CreditCard className="h-3.5 w-3.5" />
                Upgrade to Resume Service
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Usage Meters */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* AI Messages */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-bold text-foreground">AI Messages</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {workspace.messages_used}/{workspace.message_limit}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all ${
                messageUsagePercent >= 90 ? 'bg-rose-500' : messageUsagePercent >= 70 ? 'bg-amber-500' : 'bg-indigo-500'
              }`}
              style={{ width: `${Math.min(messageUsagePercent, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {messageUsagePercent.toFixed(0)}% used this period
          </p>
        </div>

        {/* Knowledge Docs */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-foreground">Knowledge Docs</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {workspace.knowledge_docs_used}/{workspace.knowledge_doc_limit}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all ${
                knowledgeUsagePercent >= 90 ? 'bg-rose-500' : knowledgeUsagePercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(knowledgeUsagePercent, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {knowledgeUsagePercent.toFixed(0)}% of limit reached
          </p>
        </div>

        {/* CRM Leads */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-foreground">CRM Leads</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              {workspace.crm_leads_used}/{workspace.crm_lead_limit}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full transition-all ${
                crmUsagePercent >= 90 ? 'bg-rose-500' : crmUsagePercent >= 70 ? 'bg-amber-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(crmUsagePercent, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            {crmUsagePercent.toFixed(0)}% of limit reached
          </p>
        </div>
      </div>

      {/* Current Plan */}
      {currentPlan && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground mb-3">Current Plan</h3>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-bold text-foreground">{currentPlan.name}</p>
              <p className="text-2xl font-mono text-indigo-400 mt-1">
                ${(currentPlan.price_usd / 100).toFixed(0)}
                <span className="text-sm text-muted-foreground">/month</span>
              </p>
            </div>
            <span className="rounded-full bg-indigo-500/10 border border-indigo-500/30 px-3 py-1 text-xs font-bold text-indigo-400">
              Active
            </span>
          </div>
        </div>
      )}

      {/* Upgrade Options */}
      <div id="upgrade" className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Upgrade Options</h3>
          
          {/* Currency Selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                currency === 'USD'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              💵 USD
            </button>
            <button
              onClick={() => setCurrency('NGN')}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition ${
                currency === 'NGN'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              🇳🇬 NGN
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {availablePlans
            .filter(p => p.slug !== 'free_trial' && p.slug !== currentPlan?.slug)
            .map((plan) => (
              <div key={plan.id} className="rounded-lg border border-border bg-card p-4">
                <h4 className="text-sm font-bold text-foreground">{plan.name}</h4>
                <p className="text-2xl font-mono text-indigo-400 mt-2">
                  {plan.price_usd === 0 && plan.slug === 'enterprise' ? (
                    <span className="text-lg">Custom Pricing</span>
                  ) : (
                    <>
                      {currency === 'USD' 
                        ? `$${(plan.price_usd / 100).toFixed(0)}`
                        : `₦${(plan.price_ngn / 100).toLocaleString()}`
                      }
                      <span className="text-sm text-muted-foreground">/mo</span>
                    </>
                  )}
                </p>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <li>✓ {plan.ai_message_cap.toLocaleString()} AI messages</li>
                  <li>✓ {plan.knowledge_doc_cap.toLocaleString()} knowledge docs</li>
                  <li>✓ {plan.crm_lead_cap.toLocaleString()} CRM leads</li>
                  {plan.has_whatsapp && <li>✓ WhatsApp integration</li>}
                  {plan.has_telegram && <li>✓ Telegram integration</li>}
                  {plan.features?.priority_support && <li>✓ Priority support</li>}
                </ul>
                <button
                  onClick={() => handleUpgrade(plan.slug)}
                  disabled={loading !== null}
                  className="mt-4 w-full rounded bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {loading === plan.slug ? 'Processing...' : plan.slug === 'enterprise' ? 'Contact Sales' : 'Upgrade Now'}
                </button>
              </div>
            ))}
        </div>
      </div>

      {/* Message Top-Up (for Pro/Business tiers) */}
      {!isFreeTrial && workspace.subscription_tier !== 'enterprise' && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-bold text-foreground mb-2">Need More AI Messages?</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Running low on messages before your next billing cycle? Purchase a one-time top-up.
          </p>
          <button
            onClick={() => alert('Top-up feature coming soon!')}
            className="inline-flex items-center gap-2 rounded border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-bold text-indigo-400 transition hover:bg-indigo-500/20"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Buy 1,000 Messages for $10
          </button>
        </div>
      )}
    </div>
  );
}
