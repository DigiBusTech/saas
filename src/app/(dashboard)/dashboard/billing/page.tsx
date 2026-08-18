'use client';

import { useState, useEffect } from 'react';

type Region = 'global' | 'africa';

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  price_usd: number;
  price_ngn: number;
  telegram_message_limit: number;
  whatsapp_message_limit: number;
  monthly_token_limit: number;
  allow_telegram: boolean;
  allow_whatsapp: boolean;
  features: Record<string, boolean>;
}

export default function BillingPage() {
  const [region, setRegion] = useState<Region>('global');
  const [loading, setLoading] = useState<string | null>(null);
  const [includeSetup, setIncludeSetup] = useState(false);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [fetching, setFetching] = useState(true);

  // Fetch plans from DB on mount via Supabase client
  useEffect(() => {
    async function loadPlans() {
      try {
        const { createBrowserClient } = await import('@supabase/ssr');
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .neq('slug', 'trial')
          .order('sort_order');
        setPlans(data ?? []);
      } catch (err) {
        console.error('Failed to load plans:', err);
      } finally {
        setFetching(false);
      }
    }
    loadPlans();
  }, []);

  async function handleCheckout(planSlug: string) {
    setLoading(planSlug);

    const endpoint = region === 'africa'
      ? '/api/checkout/flutterwave'
      : '/api/checkout/stripe';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planSlug, setupFee: includeSetup }),
      });

      const data = await res.json();

      if (region === 'global' && data.url) {
        window.location.href = data.url;
      } else if (region === 'africa' && data.config) {
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

  if (fetching) {
    return (
      <div className="max-w-4xl space-y-8">
        <div className="text-center py-12 text-gray-500 text-sm">Loading plans…</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="text-lg font-bold text-white">Choose Your Plan</h2>
        <p className="text-xs text-gray-500 mt-1">
          Select your region to see local pricing. All plans include a 14-day money-back guarantee.
        </p>
      </div>

      {/* Region Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setRegion('global')}
          className={`px-4 py-2 rounded text-xs font-semibold transition ${
            region === 'global'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white'
          }`}
        >
          🌍 Global (USD — Stripe)
        </button>
        <button
          onClick={() => setRegion('africa')}
          className={`px-4 py-2 rounded text-xs font-semibold transition ${
            region === 'africa'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white'
          }`}
        >
          🌍 Africa (NGN — Flutterwave)
        </button>
      </div>

      {/* Setup Fee Toggle */}
      <label className="flex items-center gap-3 bg-[#0F1219] border border-gray-800 rounded-lg p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={includeSetup}
          onChange={(e) => setIncludeSetup(e.target.checked)}
          className="w-4 h-4 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500"
        />
        <div>
          <span className="text-xs text-white font-semibold">
            Add Full Setup & Installation Package
          </span>
          <span className="text-[10px] text-gray-500 block mt-0.5">
            {region === 'global' ? '$499 one-time' : '₦350,000 one-time'} — We configure everything for you: WhatsApp Business API, Telegram bot, knowledge base setup, and go-live testing.
          </span>
        </div>
      </label>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const totalMessages = plan.telegram_message_limit + plan.whatsapp_message_limit;
          return (
            <div
              key={plan.id}
              className="bg-[#0F1219] border border-gray-800 rounded-lg p-5 flex flex-col justify-between hover:border-indigo-900/50 transition"
            >
              <div>
                <h3 className="text-sm font-bold text-white">{plan.name}</h3>
                <p className="text-2xl font-light text-indigo-400 mt-2 font-mono">
                  {region === 'global'
                    ? `$${(plan.price_usd / 100).toFixed(0)}`
                    : `₦${(plan.price_ngn / 100).toLocaleString()}`}
                  <span className="text-xs text-gray-500 font-normal">/mo</span>
                </p>
                <ul className="mt-4 space-y-2 text-[10px] text-gray-400">
                  <li>✓ {totalMessages.toLocaleString()} total messages/month</li>
                  {plan.allow_telegram && <li>✓ Telegram: {plan.telegram_message_limit.toLocaleString()} msgs</li>}
                  {plan.allow_whatsapp && <li>✓ WhatsApp: {plan.whatsapp_message_limit.toLocaleString()} msgs</li>}
                  <li>✓ {plan.monthly_token_limit.toLocaleString()} AI tokens/month</li>
                  <li>✓ Knowledge base grounding</li>
                  {plan.features?.priority_support && <li>✓ Priority support</li>}
                  {plan.features?.ai_insights && <li>✓ AI Business Insights</li>}
                  {plan.features?.dedicated_account_manager && <li>✓ Dedicated account manager</li>}
                </ul>
              </div>
              <button
                onClick={() => handleCheckout(plan.slug)}
                disabled={loading !== null}
                className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2 rounded text-xs font-bold uppercase tracking-wide transition"
              >
                {loading === plan.slug ? 'Processing...' : 'Subscribe'}
              </button>
            </div>
          );
        })}
      </div>

      {plans.length === 0 && (
        <div className="text-center py-8 text-gray-500 text-sm">
          No plans available. Contact the platform administrator.
        </div>
      )}

      {/* Flutterwave CDN script (loaded only when Africa region is selected) */}
      {region === 'africa' && (
        // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document
        <script src="https://checkout.flutterwave.com/v3.js" async />
      )}
    </div>
  );
}
