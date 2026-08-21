import { ReactNode } from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  variant?: 'login' | 'signup';
  footer?: ReactNode;
}

const SOCIAL_PROOF = [
  'Autopilot, Copilot, and Manual modes for every conversation',
  'Multi-channel inbox for WhatsApp, Telegram, and web chat',
  'AI grounded in your knowledge base with RAG retrieval',
  'Live order tracking, checkout, and post-purchase automation',
];

const SIGNUP_HIGHLIGHTS = [
  { label: 'Free trial', value: '14 days' },
  { label: 'Setup', value: 'Guided' },
  { label: 'Workspaces', value: 'Multi-brand' },
];

const LOGIN_HIGHLIGHTS = [
  { label: 'Uptime', value: '99.9%' },
  { label: 'Inboxes', value: 'Unified' },
  { label: 'Handoff', value: 'One-click' },
];

export function AuthShell({ title, subtitle, children, variant = 'login', footer }: AuthShellProps) {
  const highlights = variant === 'signup' ? SIGNUP_HIGHLIGHTS : LOGIN_HIGHLIGHTS;

  return (
    <div className="relative min-h-screen bg-[#050914] text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute -right-40 bottom-1/4 h-96 w-96 rounded-full bg-indigo-500/10 blur-[120px]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-2">
        <aside className="hidden flex-col justify-between border-r border-white/5 bg-[#060b1a] px-12 py-12 lg:flex">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-cyan-400 to-blue-500 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/30">
                SB
              </span>
              SabiBio
            </Link>

            <div className="mt-16 max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
                Built for modern operators
              </p>
              <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-white">
                Run every customer conversation on autopilot without losing the human touch.
              </h1>
              <p className="mt-5 text-sm leading-6 text-slate-400">
                SabiBio unifies WhatsApp, Telegram, and web chat into one calm inbox with AI grounded in your business, escalation guardrails, and payment-ready commerce.
              </p>
            </div>

            <ul className="mt-10 space-y-3">
              {SOCIAL_PROOF.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-4 border-t border-white/5 pt-8">
            {highlights.map((item) => (
              <div key={item.label}>
                <p className="text-2xl font-semibold text-white">{item.value}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
        </aside>

        <main className="flex items-center justify-center px-4 py-12 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between lg:hidden">
              <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-cyan-400 to-blue-500 text-xs font-bold text-slate-950">
                  SB
                </span>
                SabiBio
              </Link>
              <Link href="/" className="text-xs text-slate-400 hover:text-white">
                ← Back
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
              <div className="mb-8">
                <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
                <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
              </div>

              {children}
            </div>

            {footer && <div className="mt-6 text-center text-xs text-slate-500">{footer}</div>}
          </div>
        </main>
      </div>
    </div>
  );
}
