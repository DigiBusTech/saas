'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  ShoppingBag,
  Link as LinkIcon,
  Cpu,
  Check,
} from 'lucide-react';

type FeatureKey = 'whatsapp' | 'commerce' | 'sabibio' | 'ai';

const FEATURES: Record<
  FeatureKey,
  {
    label: string;
    title: string;
    description: string;
    bullets: string[];
    icon: typeof MessageCircle;
    accent: string;
  }
> = {
  whatsapp: {
    label: 'WhatsApp Automation',
    title: 'WhatsApp and Telegram, running on autopilot.',
    description:
      'Connect your official channels once. SabiBio triages, replies, escalates, and hands off to human teammates without dropping context.',
    bullets: [
      'Verified Cloud API & Telegram Bot integrations',
      'Autopilot, Copilot, and Manual response modes',
      'Escalation to humans when sentiment drops',
      'Broadcasts, flash sales, and post-purchase drips',
    ],
    icon: MessageCircle,
    accent: 'from-emerald-400 to-teal-500',
  },
  commerce: {
    label: 'Order Management',
    title: 'Live orders, checkout, and fulfillment tracking.',
    description:
      'Every product and service is checkout-ready. Track orders from intent to delivery with real-time status broadcasts to the customer.',
    bullets: [
      'Product & service catalog with codes and pricing',
      'Stripe and Flutterwave webhooks pre-wired',
      'Order lifecycle: pending → paid → shipped → delivered',
      'Auto-notify customers on status changes',
    ],
    icon: ShoppingBag,
    accent: 'from-amber-400 to-orange-500',
  },
  sabibio: {
    label: 'SabiBio Link-in-Bio',
    title: 'One link. Your whole business.',
    description:
      'Publish a beautiful SabiBio page with products, services, articles, social channels, checkout, and embedded web chat.',
    bullets: [
      'Drag-and-drop page builder',
      'Product collections and service booking',
      'Custom domain & workspace-specific themes',
      'Web chat widget embedded automatically',
    ],
    icon: LinkIcon,
    accent: 'from-fuchsia-400 to-pink-500',
  },
  ai: {
    label: 'Multi-Channel AI',
    title: 'AI grounded in your knowledge, not the internet.',
    description:
      'RAG-powered replies over your knowledge base with strict grounding. Multi-provider failover keeps the assistant online.',
    bullets: [
      'pgvector semantic search over your KB',
      'Grounding-first — the AI admits when it doesn’t know',
      'Multi-provider failover (OpenAI, Groq)',
      'Sentiment guardrails auto-pause hostile chats',
    ],
    icon: Cpu,
    accent: 'from-cyan-400 to-blue-500',
  },
};

const KEYS: FeatureKey[] = ['whatsapp', 'commerce', 'sabibio', 'ai'];

export function FeatureShowcase() {
  const [active, setActive] = useState<FeatureKey>('whatsapp');
  const feature = FEATURES[active];
  const Icon = feature.icon;

  return (
    <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-12">
      <nav className="flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {KEYS.map((key) => {
          const item = FEATURES[key];
          const isActive = key === active;
          const ItemIcon = item.icon;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActive(key)}
              className={`group relative flex min-w-45 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all lg:min-w-0 ${
                isActive
                  ? 'border-cyan-400/40 bg-cyan-400/10 text-white shadow-lg shadow-cyan-500/10'
                  : 'border-white/5 bg-white/2 text-slate-300 hover:border-white/10 hover:bg-white/4'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-linear-to-br ${item.accent} text-slate-950 shadow-md`}
              >
                <ItemIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{item.label}</p>
                <p className="mt-0.5 text-[11px] text-slate-500 line-clamp-1">
                  {item.title}
                </p>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="relative min-h-96 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-6 flex items-center gap-4">
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br ${feature.accent} text-slate-950 shadow-lg`}
              >
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                  {feature.label}
                </p>
                <h3 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                  {feature.title}
                </h3>
              </div>
            </div>

            <p className="max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
              {feature.description}
            </p>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {feature.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-2 rounded-lg border border-white/5 bg-white/3 p-3 text-sm text-slate-200"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
