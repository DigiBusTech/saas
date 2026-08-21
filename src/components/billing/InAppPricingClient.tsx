'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Crown, ArrowRight } from 'lucide-react';
import { BillingTogglePill, type BillingInterval } from '@/components/billing/BillingToggle';

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  price_usd: number;
  price_monthly_usd: number | null;
  price_annual_usd: number | null;
  price_monthly_ngn: number | null;
  price_annual_ngn: number | null;
  annual_discount_percentage: number | null;
  telegram_message_limit: number;
  whatsapp_message_limit: number;
  monthly_token_limit: number;
  max_workspaces: number;
  allow_telegram: boolean;
  allow_whatsapp: boolean;
  ai_message_cap: number | null;
  knowledge_doc_cap: number | null;
  crm_lead_cap: number | null;
  has_telegram: boolean | null;
  has_whatsapp: boolean | null;
  is_enterprise_contact_sales: boolean | null;
  features: Record<string, boolean> | null;
  sort_order: number;
}

function formatPrice(cents: number | null, interval: BillingInterval) {
  if (!cents) return '$0';
  const dollars = cents / 100;
  if (interval === 'annual') {
    return `$${(dollars / 12).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }
  return `$${dollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function planFeatureList(plan: PlanRow): string[] {
  const items: string[] = [];
  
  const aiMessages = plan.ai_message_cap ?? (plan.telegram_message_limit + plan.whatsapp_message_limit);
  const knowledgeDocs = plan.knowledge_doc_cap ?? 10;
  const crmLeads = plan.crm_lead_cap ?? 50;
  
  items.push(`${plan.max_workspaces} workspace${plan.max_workspaces === 1 ? '' : 's'}`);
  
  const channels: string[] = [];
  if (plan.has_telegram ?? plan.allow_telegram) channels.push('Telegram');
  if (plan.has_whatsapp ?? plan.allow_whatsapp) channels.push('WhatsApp');
  if (channels.length) items.push(channels.join(' + '));
  
  items.push(`${aiMessages.toLocaleString()} AI messages / month`);
  items.push(`${knowledgeDocs.toLocaleString()} RAG knowledge documents`);
  items.push(`${crmLeads.toLocaleString()} CRM leads`);
  
  if (plan.features?.ai_insights) items.push('AI business insights');
  if (plan.features?.priority_support) items.push('Priority support');
  if (plan.features?.dedicated_account_manager) items.push('Dedicated account manager');
  
  return items;
}

interface InAppPricingClientProps {
  plans: PlanRow[];
  currentPlanSlug?: string;
  currentPlanId?: string;
}

export function InAppPricingClient({ plans, currentPlanSlug, currentPlanId }: InAppPricingClientProps) {
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loading, setLoading] = useState<string | null>(null);
  
  const currentPlan = plans.find(p => p.slug === currentPlanSlug || p.id === currentPlanId);
  const currentPrice = currentPlan?.price_monthly_usd ?? currentPlan?.price_usd ?? 0;

  async function handleCheckout(planSlug: string) {
    setLoading(planSlug);
    try {
      const res = await fetch('/api/checkout/flutterwave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          plan_slug: planSlug,
          interval,
          currency: 'USD'
        }),
      });

      const data = await res.json();

      if (data.config) {
        // @ts-expect-error — FlutterwaveCheckout loaded from CDN script
        if (typeof window.FlutterwaveCheckout === 'function') {
          // @ts-expect-error
          window.FlutterwaveCheckout(data.config);
        } else {
          window.location.href = data.config.redirect_url || '#';
        }
      } else {
        console.error('Checkout error:', data.error);
        alert(data.error || 'Checkout failed');
      }
    } catch (err) {
      console.error('Checkout request failed:', err);
      alert('Failed to initiate checkout');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Manage Your Subscription
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Choose the plan that best fits your business needs. Upgrade or downgrade at any time.
        </p>
        {currentPlan && (
          <div className="mt-6 inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-4 py-2">
            <Crown className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              Current Plan: {currentPlan.name}
            </span>
          </div>
        )}
      </div>

      {/* Billing Interval Toggle */}
      <div className="flex justify-center">
        <BillingTogglePill value={interval} onChange={setInterval} />
      </div>
      {interval === 'annual' && (
        <p className="text-center text-sm text-emerald-400 font-medium">
          💰 Save 17% with annual billing — that's 2 months free!
        </p>
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.slug === currentPlanSlug || plan.id === currentPlanId;
          const monthlyPrice = plan.price_monthly_usd ?? plan.price_usd;
          const annualPrice = plan.price_annual_usd ?? (monthlyPrice * 10);
          const displayPrice = interval === 'monthly' ? monthlyPrice : annualPrice;
          const planPrice = monthlyPrice;
          
          const isUpgrade = planPrice > currentPrice;
          const isDowngrade = planPrice < currentPrice && !isCurrent;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-xl border p-5 md:p-6 transition-all ${
                isCurrent 
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' 
                  : 'border-border bg-card hover:border-primary/40'
              }`}
            >
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                  Current Plan
                </div>
              )}
              
              <h3 className="text-lg md:text-xl font-bold text-foreground">{plan.name}</h3>
              
              <div className="mt-4 mb-6">
                {plan.is_enterprise_contact_sales ? (
                  <div>
                    <p className="text-3xl font-bold text-foreground">Custom</p>
                    <p className="text-xs text-muted-foreground mt-1">Contact sales for pricing</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-3xl md:text-4xl font-bold text-foreground">
                      {formatPrice(displayPrice, interval)}
                      <span className="text-sm font-normal text-muted-foreground"> / month</span>
                    </p>
                    {interval === 'annual' && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Billed ${((annualPrice ?? 0) / 100).toLocaleString()} annually
                      </p>
                    )}
                  </div>
                )}
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {planFeatureList(plan).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-xs md:text-sm text-foreground/90">
                    <Check className="w-4 h-4 shrink-0 text-primary mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              {isCurrent ? (
                <button
                  disabled
                  className="w-full py-3 px-4 rounded-lg bg-muted border border-border text-muted-foreground font-medium text-sm cursor-not-allowed"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    Current Plan
                  </div>
                </button>
              ) : plan.is_enterprise_contact_sales ? (
                <Link
                  href="/contact"
                  className="w-full py-3 px-4 rounded-lg border border-primary text-primary hover:bg-primary hover:text-primary-foreground font-semibold text-sm transition-all text-center"
                >
                  Contact Sales
                </Link>
              ) : (
                <button
                  onClick={() => handleCheckout(plan.slug)}
                  disabled={loading === plan.slug}
                  className={`w-full py-3 px-4 rounded-lg font-semibold text-sm transition-all ${
                    isUpgrade
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border border-border text-foreground hover:bg-muted'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === plan.slug ? (
                    'Processing...'
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      {isUpgrade ? 'Upgrade' : isDowngrade ? 'Downgrade' : 'Select'} to {plan.name}
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Additional Info */}
      <div className="bg-muted/50 border border-border rounded-xl p-6 md:p-8 text-center max-w-3xl mx-auto">
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Need help choosing?
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          All plans include a 14-day money-back guarantee. Upgrade, downgrade, or cancel anytime.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          Contact our sales team
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
