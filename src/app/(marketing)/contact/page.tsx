'use client';

import { useState } from 'react';
import { Mail, MessageCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { MarketingNav, MarketingFooter } from '../marketing-nav';
import { submitContactMessage } from './actions';

export default function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(formData: FormData) {
    setStatus('sending');
    setError('');
    const result = await submitContactMessage(formData);
    if (result?.error) {
      setError(result.error);
      setStatus('error');
      return;
    }
    setStatus('sent');
  }

  return (
    <main className="min-h-screen bg-[#081018] text-slate-100">
      <MarketingNav />

      <section className="mx-auto grid max-w-5xl gap-12 px-6 py-16 lg:grid-cols-[1fr_1.2fr] lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Contact</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">Talk to the team.</h1>
          <p className="mt-5 max-w-md text-base leading-7 text-slate-400">
            Questions about pricing, onboarding, or a custom integration? Send us a message and we&apos;ll reply by email.
          </p>

          <div className="mt-10 space-y-4">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Mail className="h-4 w-4 text-cyan-300" />
              <a href="mailto:hello@sabibio.com" className="hover:text-white">hello@sabibio.com</a>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <MessageCircle className="h-4 w-4 text-cyan-300" />
              <span>Typical response time: under 1 business day</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0b1620] p-6 sm:p-8">
          {status === 'sent' ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Message sent</h2>
              <p className="max-w-sm text-sm text-slate-400">Thanks for reaching out — a member of the team will get back to you shortly.</p>
            </div>
          ) : (
            <form action={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2 text-xs text-rose-300">{error}</div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Name</label>
                  <input name="name" required className="w-full rounded-lg border border-slate-700 bg-[#081018] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Email</label>
                  <input name="email" type="email" required className="w-full rounded-lg border border-slate-700 bg-[#081018] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Company (optional)</label>
                <input name="company" className="w-full rounded-lg border border-slate-700 bg-[#081018] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Message</label>
                <textarea name="message" required rows={5} className="w-full resize-none rounded-lg border border-slate-700 bg-[#081018] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-300/50" />
              </div>
              <button
                type="submit"
                disabled={status === 'sending'}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:opacity-50"
              >
                {status === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
                Send message
              </button>
            </form>
          )}
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
