import Link from 'next/link';
import { Check } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { MarketingNav, MarketingFooter } from '../marketing-nav';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Pricing | SabiBio' };

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  price_usd: number;
  telegram_message_limit: number;
  whatsapp_message_limit: number;
  monthly_token_limit: number;
  max_workspaces: number;
  allow_telegram: boolean;
  allow_whatsapp: boolean;
  features: Record<string, boolean> | null;
  sort_order: number;
}

function formatPrice(cents: number) {
  if (!cents) return '$0';
  return `$${(cents / 100).toLocaleString()}`;
}

function planFeatureList(plan: PlanRow): string[] {
  const items: string[] = [];
  items.push(`${plan.max_workspaces} workspace${plan.max_workspaces === 1 ? '' : 's'}`);
  const channels: string[] = [];
  if (plan.allow_telegram) channels.push('Telegram');
  if (plan.allow_whatsapp) channels.push('WhatsApp');
  if (channels.length) items.push(channels.join(' + '));
  items.push(`${(plan.telegram_message_limit + plan.whatsapp_message_limit).toLocaleString()} messages / month`);
  items.push(`${plan.monthly_token_limit.toLocaleString()} AI tokens / month`);
  if (plan.features?.ai_insights) items.push('AI business insights');
  if (plan.features?.priority_support) items.push('Priority support');
  if (plan.features?.has_tenant_monitoring) items.push('Observability & monitoring');
  return items;
}

export default async function PricingPage() {
  const db = createServiceClient();
  const { data } = await db
    .from('subscription_plans')
    .select('id, name, slug, price_usd, telegram_message_limit, whatsapp_message_limit, monthly_token_limit, max_workspaces, allow_telegram, allow_whatsapp, features, sort_order')
    .eq('is_active', true)
    .order('sort_order');

  const plans = (data ?? []) as PlanRow[];
  const featuredSlug = plans.length > 1 ? plans[Math.floor(plans.length / 2)]?.slug : plans[0]?.slug;

  return (
    <main className="min-h-screen bg-[#081018] text-slate-100">
      <MarketingNav />

      <section className="mx-auto max-w-5xl px-6 py-16 text-center lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Pricing</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Simple plans that grow with your business.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-400">
          Every plan includes a real workspace, live WhatsApp/Telegram integrations, and a knowledge base.
          Upgrade any time as your conversation volume grows.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 lg:px-8">
        {plans.length === 0 ? (
          <p className="text-center text-sm text-slate-500">Plans are being configured. Please check back shortly.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const featured = plan.slug === featuredSlug;
              return (
                <article
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border p-6 ${
                    featured ? 'border-cyan-300/60 bg-cyan-300/[0.07]' : 'border-slate-800 bg-[#0b1620]'
                  }`}
                >
                  {featured && (
                    <span className="absolute right-5 top-5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <p className="mt-8 text-4xl font-semibold text-white">
                    {formatPrice(plan.price_usd)}
                    <span className="text-sm font-normal text-slate-500"> / month</span>
                  </p>
                  <ul className="mt-8 flex-1 space-y-3 text-sm text-slate-300">
                    {planFeatureList(plan).map((item) => (
                      <li key={item} className="flex items-start gap-2 border-b border-slate-800 pb-3">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={`mt-8 rounded-full px-4 py-3 text-center text-sm font-semibold transition ${
                      featured ? 'bg-cyan-300 text-slate-950 hover:bg-cyan-200' : 'border border-slate-700 text-white hover:border-slate-500'
                    }`}
                  >
                    Choose {plan.name}
                  </Link>
                </article>
              );
            })}
          </div>
        )}

        <p className="mt-10 text-center text-xs text-slate-500">
          Need a custom plan or Naira/Flutterwave billing?{' '}
          <Link href="/contact" className="text-cyan-300 hover:text-cyan-200">Talk to us</Link>.
        </p>
      </section>

      <MarketingFooter />
    </main>
  );
}
