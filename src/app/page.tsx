import Link from 'next/link';
import { ArrowRight, PlayCircle, Sparkles } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { MarketingNav, MarketingFooter } from './(marketing)/marketing-nav';
import { HeroPreview } from '@/components/marketing/HeroPreview';
import { FeatureShowcase } from '@/components/marketing/FeatureShowcase';
import { LiveDemoChat } from '@/components/marketing/LiveDemoChat';
import { PricingSection, PricingPlanCard } from '@/components/marketing/PricingSection';

export const dynamic = 'force-dynamic';

const PRINCIPLES = [
  ['01', 'One tenant, many workspaces', 'Isolated CRM, catalog, AI persona, and SabiBio page per brand, branch, or client.'],
  ['02', 'AI grounded in your business', 'Answers come from your knowledge base and product data — not the open web.'],
  ['03', 'Never lose the human', 'Autopilot, Copilot, and Manual modes. Escalate on sentiment or a single click.'],
  ['04', 'Automations that follow through', 'Post-purchase, renewal, expiry, flash-sale, and broadcast reminders in the customer’s language.'],
  ['05', 'Turn attention into action', 'A SabiBio link hub with products, services, articles, checkout, and web chat.'],
  ['06', 'Operate with control', 'Super Admin console for plans, providers, telemetry, billing, and platform health.'],
];

const FAQ = [
  ['Can I start without a technical team?', 'Yes. The onboarding assistant walks you through connecting WhatsApp, Telegram, and payments with zero code.'],
  ['Can my team take over from the AI?', 'Any teammate can pause the AI on a conversation, reply as a human, and return the thread to automation later.'],
  ['Where does the AI get its answers?', 'From the knowledge, articles, and products you add to the workspace. Multi-provider failover keeps it online.'],
  ['What happens if I hit my plan limit?', 'The AI hands the conversation off to a human teammate and shows an upgrade prompt — no messages are lost.'],
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

export default async function Home() {
  const db = createServiceClient();
  const { data } = await db
    .from('subscription_plans')
    .select('id, name, slug, price_usd, max_workspaces, telegram_message_limit, whatsapp_message_limit, features, sort_order')
    .eq('is_active', true)
    .order('sort_order')
    .limit(3);

  const rows = (data ?? []) as PlanRow[];
  const plans: PricingPlanCard[] = rows.map((plan) => ({
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    priceCents: plan.price_usd,
    maxWorkspaces: plan.max_workspaces,
    messageLimit: plan.telegram_message_limit + plan.whatsapp_message_limit,
    features: plan.features,
  }));
  const featuredSlug = plans.length > 1 ? plans[Math.floor(plans.length / 2)]?.slug : plans[0]?.slug;

  return (
    <main className="min-h-screen overflow-hidden bg-[#050914] text-slate-100">
      <MarketingNav />

      <section className="relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 top-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-[140px]" />
          <div className="absolute -right-40 top-64 h-96 w-96 rounded-full bg-indigo-500/10 blur-[140px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="grid gap-16 lg:grid-cols-[1.05fr_1fr] lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="uppercase tracking-widest">New</span>
                <span className="text-cyan-100/80">Autonomous commerce agent, live</span>
              </div>

              <h1 className="mt-6 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl lg:text-6xl">
                Turn every customer conversation into momentum.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-400 sm:text-lg">
                SabiBio gives every business a live AI assistant, shared inbox, CRM, automation engine, public SabiBio page, and a human team that can step in at any moment.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-linear-to-r from-cyan-300 to-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:from-cyan-200 hover:to-cyan-300"
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#live-demo"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/10"
                >
                  <PlayCircle className="h-4 w-4 text-cyan-300" />
                  Try live demo
                </a>
              </div>

              <div className="mt-10 grid gap-6 border-t border-white/5 pt-6 sm:grid-cols-3">
                <Metric value="24/7" label="Always-on first response" />
                <Metric value="1 inbox" label="For every channel and handoff" />
                <Metric value="0 guesswork" label="Answers grounded in your content" />
              </div>
            </div>

            <div className="lg:mt-0">
              <HeroPreview />
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-white/5 bg-[#060b1a]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
              Everything you need, in one place
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Modern operations for WhatsApp-first businesses.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-400">
              Every capability is designed for non-technical operators. Explore what SabiBio unlocks for your team.
            </p>
          </div>
          <div className="mt-12">
            <FeatureShowcase />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
          A calmer operating system
        </p>
        <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          From first message to loyal customer, with fewer loose ends.
        </h2>
        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map(([number, title, copy]) => (
            <article
              key={number}
              className="rounded-2xl border border-white/5 bg-white/2 p-6 transition hover:border-cyan-400/20 hover:bg-white/4"
            >
              <p className="font-mono text-xs text-cyan-300">{number}</p>
              <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="live-demo" className="border-y border-white/5 bg-[#060b1a]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
                Try it right here
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Chat with a live SabiBio agent.
              </h2>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">
                This is the same widget you can embed on any website in one line of code. It hands off to a human teammate, tracks orders, and stays grounded in your knowledge base.
              </p>
              <ul className="mt-8 space-y-3 text-sm text-slate-300">
                <DemoBullet>Ask about pricing, orders, or integrations</DemoBullet>
                <DemoBullet>Watch it respond with tone-aware answers</DemoBullet>
                <DemoBullet>Try phrases that would trigger escalation</DemoBullet>
              </ul>
            </div>
            <LiveDemoChat />
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
            Pricing that grows with you
          </p>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
            Start small. Keep your context.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-400">
            Every plan includes a real workspace, live integrations, and a knowledge base. Upgrade when your conversations deserve more room.
          </p>
        </div>

        <PricingSection plans={plans} featuredSlug={featuredSlug} />

        <p className="mt-8 text-center text-xs text-slate-500">
          <Link href="/pricing" className="text-cyan-300 hover:text-cyan-200">
            See full plan comparison →
          </Link>
        </p>
      </section>

      <section id="faq" className="border-t border-white/5 bg-[#060b1a]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-12 md:grid-cols-[0.9fr_1.2fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Resources</p>
              <h2 className="mt-4 text-3xl font-semibold text-white">
                Everything you need to get moving.
              </h2>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/docs"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-300 hover:text-white"
                >
                  Documentation
                </Link>
                <Link
                  href="/contact"
                  className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-300 hover:text-white"
                >
                  Contact support
                </Link>
              </div>
            </div>
            <div className="space-y-6">
              {FAQ.map(([q, a]) => (
                <div key={q} className="rounded-xl border border-white/5 bg-white/2 p-5">
                  <h3 className="font-semibold text-white">{q}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-400">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-linear-to-br from-cyan-500/10 via-blue-500/5 to-transparent p-8 shadow-2xl sm:p-12">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
          </div>
          <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
                Ready when you are
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
                Start with a workspace in under two minutes.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
                Free trial. No credit card. Bring your team along and connect your channels whenever you&apos;re ready.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-200"
              >
                Create workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:border-cyan-300 hover:bg-white/10"
              >
                View pricing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold text-white sm:text-3xl">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function DemoBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
      <span>{children}</span>
    </li>
  );
}
