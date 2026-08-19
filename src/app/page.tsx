import Link from 'next/link';
import { Check } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { MarketingNav, MarketingFooter } from './(marketing)/marketing-nav';

export const dynamic = 'force-dynamic';

const features = [
  ['01', 'One tenant, many businesses', 'Create isolated workspaces for every brand, branch, or client with its own CRM, products, integrations, AI persona, and SabiBio page.'],
  ['02', 'AI grounded in your business', 'Upload knowledge, publish articles, connect products and services, and let the multi-provider AI router answer with your context.'],
  ['03', 'Conversations that never lose the human', 'Use Autopilot, Copilot, or Manual mode, with realtime inboxes, escalation alerts, and human handoff when urgency matters.'],
  ['04', 'Automations that follow through', 'Send personalized new-lead, post-purchase, renewal, expiry, flash-sale, and broadcast reminders in the customer’s familiar language.'],
  ['05', 'Turn attention into action', 'Publish a SabiBio link hub with products, services, articles, social channels, checkout options, receipts, and web chat.'],
  ['06', 'Operate with control', 'Manage plans, providers, encrypted configs, telemetry, tenant exports, billing, and platform health from the Super Admin console.'],
];

interface PlanRow {
  id: string;
  name: string;
  slug: string;
  price_usd: number;
  max_workspaces: number;
  telegram_message_limit: number;
  whatsapp_message_limit: number;
  features: Record<string, boolean> | null;
  sort_order: number;
}

function formatPrice(cents: number) {
  if (!cents) return '$0';
  return `$${(cents / 100).toLocaleString()}`;
}

export default async function Home() {
  const db = createServiceClient();
  const { data } = await db
    .from('subscription_plans')
    .select('id, name, slug, price_usd, max_workspaces, telegram_message_limit, whatsapp_message_limit, features, sort_order')
    .eq('is_active', true)
    .order('sort_order')
    .limit(3);

  const plans = (data ?? []) as PlanRow[];
  const featuredSlug = plans.length > 1 ? plans[Math.floor(plans.length / 2)]?.slug : plans[0]?.slug;

  return (
    <main className="min-h-screen overflow-hidden bg-[#081018] text-slate-100">
      <MarketingNav />

      <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-16 lg:px-8 lg:pt-24">
        <div className="pointer-events-none absolute -right-40 top-0 h-96 w-96 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="max-w-3xl">
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">AI customer operations, without the black box</p>
          <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-7xl">Turn every customer conversation into momentum.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-400">SabiBio gives every business a live AI assistant, shared inbox, CRM, automation engine, public SabiBio page, payment-ready catalog, and a human team that can take over at any moment.</p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/signup" className="rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200">Create your workspace</Link>
            <a href="#how-it-works" className="rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 hover:border-slate-500">See how it works</a>
          </div>
        </div>
        <div className="mt-20 grid gap-4 border-t border-slate-800 pt-6 text-sm sm:grid-cols-3">
          <div><p className="text-3xl font-semibold text-white">24/7</p><p className="mt-1 text-slate-500">Always-on first response</p></div>
          <div><p className="text-3xl font-semibold text-white">1 inbox</p><p className="mt-1 text-slate-500">For every channel and handoff</p></div>
          <div><p className="text-3xl font-semibold text-white">0 guesswork</p><p className="mt-1 text-slate-500">Answers grounded in your content</p></div>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-slate-800/80 bg-[#0b1620]">
        <div className="mx-auto max-w-6xl px-6 py-24 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">A calmer operating system</p>
          <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">From first message to loyal customer, with fewer loose ends.</h2>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {features.map(([number, title, copy]) => <article key={number} className="border-l border-cyan-300/40 pl-5"><p className="text-xs font-mono text-cyan-300">{number}</p><h3 className="mt-5 text-lg font-semibold text-white">{title}</h3><p className="mt-3 leading-7 text-slate-400">{copy}</p></article>)}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Pricing that grows with you</p><h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Start small. Keep your context.</h2></div><p className="max-w-sm text-sm leading-6 text-slate-400">Every plan includes a real workspace, live integrations, and a knowledge base. Upgrade when your conversations deserve more room.</p></div>
        {plans.length === 0 ? (
          <p className="mt-12 text-sm text-slate-500">Plans are being configured. Please check back shortly.</p>
        ) : (
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => {
              const featured = plan.slug === featuredSlug;
              const messageLimit = plan.telegram_message_limit + plan.whatsapp_message_limit;
              return (
                <article key={plan.id} className={`relative flex flex-col border p-6 ${featured ? 'border-cyan-300/60 bg-cyan-300/[0.07]' : 'border-slate-800 bg-[#0b1620]'}`}>
                  {featured && <span className="absolute right-5 top-5 text-[10px] font-semibold uppercase tracking-wider text-cyan-300">Most popular</span>}
                  <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                  <p className="mt-8 text-4xl font-semibold text-white">{formatPrice(plan.price_usd)}<span className="text-sm font-normal text-slate-500"> / month</span></p>
                  <ul className="mt-8 flex-1 space-y-3 text-sm text-slate-300">
                    <li className="flex items-start gap-2 border-b border-slate-800 pb-3"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />{plan.max_workspaces} workspace{plan.max_workspaces === 1 ? '' : 's'}</li>
                    <li className="flex items-start gap-2 border-b border-slate-800 pb-3"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />{messageLimit.toLocaleString()} messages / month</li>
                    {plan.features?.ai_insights && <li className="flex items-start gap-2 border-b border-slate-800 pb-3"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />AI business insights</li>}
                    {plan.features?.priority_support && <li className="flex items-start gap-2 border-b border-slate-800 pb-3"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300" />Priority support</li>}
                  </ul>
                  <Link href="/signup" className={`mt-8 rounded-full px-4 py-3 text-center text-sm font-semibold ${featured ? 'bg-cyan-300 text-slate-950' : 'border border-slate-700 text-white'}`}>Choose {plan.name}</Link>
                </article>
              );
            })}
          </div>
        )}
        <p className="mt-6 text-xs text-slate-500"><Link href="/pricing" className="text-cyan-300 hover:text-cyan-200">See full plan comparison →</Link></p>
      </section>

      <section id="faq" className="border-t border-slate-800 bg-[#0b1620]">
        <div className="mx-auto max-w-6xl px-6 py-24 lg:px-8"><div className="grid gap-12 md:grid-cols-[0.8fr_1.2fr]"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Resources</p><h2 className="mt-4 text-3xl font-semibold text-white">Everything you need to get moving.</h2><div className="mt-8 flex flex-wrap gap-3"><Link href="/docs" className="border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-300">Documentation</Link><Link href="/contact" className="border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-cyan-300">Contact support</Link></div></div><div className="space-y-7">{[['Can I start without a technical team?', 'Yes. The onboarding assistant guides setup, and each workspace includes step-by-step webhook instructions.'], ['Can my team take over from the AI?', 'Yes. Pause AI on any conversation, reply as an operator, and return the thread to automation when ready.'], ['Where does the AI get its answers?', 'From the knowledge and product content you add to the workspace, with provider failover for reliability.'], ['What happens if I hit my plan limit?', 'The AI hands the conversation to a human teammate automatically and your dashboard shows an upgrade prompt — no messages are lost.']].map(([q, a]) => <div key={q} className="border-b border-slate-800 pb-6"><h3 className="font-semibold text-white">{q}</h3><p className="mt-2 leading-7 text-slate-400">{a}</p></div>)}</div></div></div>
      </section>
      <MarketingFooter />
    </main>
  );
}
