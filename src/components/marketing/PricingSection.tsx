'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export interface PricingPlanCard {
  id: string;
  name: string;
  slug: string;
  priceCents: number;
  maxWorkspaces: number;
  messageLimit: number;
  features: Record<string, boolean> | null;
}

interface PricingSectionProps {
  plans: PricingPlanCard[];
  featuredSlug: string | undefined;
}

function formatMonthly(cents: number) {
  if (!cents) return '$0';
  return `$${(cents / 100).toLocaleString()}`;
}

function formatAnnual(cents: number) {
  if (!cents) return '$0';
  const annual = (cents * 10) / 100;
  return `$${annual.toLocaleString()}`;
}

const FEATURE_LABELS: Array<[string, string]> = [
  ['ai_insights', 'AI business insights'],
  ['priority_support', 'Priority support'],
  ['custom_domain', 'Custom domain'],
  ['human_handoff', 'Human handoff mode'],
];

export function PricingSection({ plans, featuredSlug }: PricingSectionProps) {
  const [annual, setAnnual] = useState(false);

  if (plans.length === 0) {
    return (
      <p className="mt-12 text-sm text-slate-500">
        Plans are being configured. Please check back shortly.
      </p>
    );
  }

  return (
    <div>
      <div className="mt-8 flex justify-center">
        <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setAnnual(false)}
            className={`rounded-full px-4 py-2 transition ${
              !annual ? 'bg-cyan-300 text-slate-950' : 'text-slate-300'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setAnnual(true)}
            className={`flex items-center gap-2 rounded-full px-4 py-2 transition ${
              annual ? 'bg-cyan-300 text-slate-950' : 'text-slate-300'
            }`}
          >
            Annual
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                annual ? 'bg-slate-950/20 text-slate-900' : 'bg-cyan-400/20 text-cyan-200'
              }`}
            >
              save 2 months
            </span>
          </button>
        </div>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {plans.map((plan, index) => {
          const featured = plan.slug === featuredSlug;
          const price = annual ? formatAnnual(plan.priceCents) : formatMonthly(plan.priceCents);
          const suffix = annual ? '/year' : '/month';

          return (
            <motion.article
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.4 }}
              className={`relative flex flex-col rounded-2xl border p-6 backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-2xl ${
                featured
                  ? 'border-cyan-300/60 bg-cyan-300/[0.07] shadow-xl shadow-cyan-500/10'
                  : 'border-slate-800 bg-[#0b1620]'
              }`}
            >
              {featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-300 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-950 shadow-lg">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-semibold text-white">{price}</span>
                <span className="text-sm text-slate-500">{suffix}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Billed {annual ? 'annually' : 'monthly'}. Cancel anytime.
              </p>

              <ul className="mt-6 flex-1 space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2 border-b border-slate-800/60 pb-3">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                  <span>
                    {plan.maxWorkspaces} workspace{plan.maxWorkspaces === 1 ? '' : 's'}
                  </span>
                </li>
                <li className="flex items-start gap-2 border-b border-slate-800/60 pb-3">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                  <span>{plan.messageLimit.toLocaleString()} messages / month</span>
                </li>
                {FEATURE_LABELS.filter(([key]) => plan.features?.[key]).map(([key, label]) => (
                  <li
                    key={key}
                    className="flex items-start gap-2 border-b border-slate-800/60 pb-3"
                  >
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`mt-6 rounded-full px-4 py-3 text-center text-sm font-semibold transition ${
                  featured
                    ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200'
                    : 'border border-slate-700 text-white hover:border-cyan-300'
                }`}
              >
                Start with {plan.name}
              </Link>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
}
