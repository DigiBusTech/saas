'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
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

export function PricingPageClient({ plans }: { plans: PlanRow[] }) {
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const featuredSlug = 'pro';

  return (
    <>
      <section className="mx-auto max-w-5xl px-6 py-16 text-center lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Pricing</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Simple plans that grow with your business.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400">
          Start with a <strong>14-day free trial</strong> — no credit card required. 
          Upgrade anytime as your AI message volume and lead generation needs grow.
        </p>

        {/* PHASE 4: Billing Interval Toggle */}
        <div className="mt-10 flex justify-center">
          <BillingTogglePill value={interval} onChange={setInterval} />
        </div>
        {interval === 'annual' && (
          <p className="mt-4 text-sm text-emerald-400 font-medium">
            💰 Save 17% with annual billing — that's 2 months free!
          </p>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 lg:px-8">
        {plans.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Plans are being configured. Please check back shortly.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const featured = plan.slug === featuredSlug;
              const monthlyPrice = plan.price_monthly_usd ?? plan.price_usd;
              const annualPrice = plan.price_annual_usd ?? (monthlyPrice * 10); // Default to 2 months free
              const displayPrice = interval === 'monthly' ? monthlyPrice : annualPrice;
              
              return (
                <article
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border p-6 ${
                    featured ? 'border-cyan-300/60 bg-cyan-300/[0.07]' : 'border-slate-800 bg-[#0b1620]'
                  }`}
                >
                  {plan.slug === 'free_trial' && (
                    <span className="absolute right-5 top-5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      No credit card
                    </span>
                  )}
                  {featured && plan.slug !== 'free_trial' && (
                    <span className="absolute right-5 top-5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <p className="mt-8 text-4xl font-semibold text-white">
                    {plan.is_enterprise_contact_sales ? (
                      <>
                        <span className="text-2xl">Custom</span>
                        <span className="text-sm font-normal text-slate-500 block mt-1">Contact sales</span>
                      </>
                    ) : (
                      <>
                        {formatPrice(displayPrice, interval)}
                        <span className="text-sm font-normal text-slate-500"> / {interval === 'monthly' ? 'month' : 'month'}</span>
                        {interval === 'annual' && (
                          <span className="block text-sm font-normal text-slate-600 mt-1">
                            Billed ${((annualPrice ?? 0) / 100).toLocaleString()} annually
                          </span>
                        )}
                      </>
                    )}
                  </p>
                  <ul className="mt-8 flex-1 space-y-3 text-sm text-slate-300">
                    {planFeatureList(plan).map((item) => (
                      <li key={item} className="flex items-start gap-2 border-b border-slate-800 pb-3">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  {plan.is_enterprise_contact_sales ? (
                    <Link
                      href="/contact"
                      className="mt-8 rounded-full border border-slate-700 px-4 py-3 text-center text-sm font-semibold text-white transition hover:border-slate-500"
                    >
                      Contact Sales
                    </Link>
                  ) : (
                    <Link
                      href={`/signup?plan=${plan.slug}&interval=${interval}`}
                      className={`mt-8 rounded-full px-4 py-3 text-center text-sm font-semibold transition ${
                        featured ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200' : 'border border-slate-700 text-white hover:border-slate-500'
                      }`}
                    >
                      {plan.slug === 'free_trial' ? 'Start Free Trial' : `Choose ${plan.name}`}
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
