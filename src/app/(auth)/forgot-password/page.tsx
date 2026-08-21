'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { requestPasswordReset } from '../actions';
import { AuthShell } from '@/components/auth/AuthShell';

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await requestPasswordReset(formData);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <AuthShell
      variant="login"
      title="Reset your password"
      subtitle="We&apos;ll email a secure link to reset your SabiBio password."
      footer={
        <span>
          Remembered it?{' '}
          <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
            Back to sign in
          </Link>
        </span>
      }
    >
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-start gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {sent ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold text-emerald-100">Check your inbox</p>
            <p className="mt-1 text-xs text-emerald-200/80">
              If an account exists for that email, you&apos;ll receive a password reset link in a few moments.
            </p>
          </div>
        </motion.div>
      ) : (
        <form action={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Email address
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                name="email"
                placeholder="you@company.com"
                autoComplete="email"
                className="w-full rounded-lg border border-slate-700/50 bg-black/40 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 transition-all focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20"
                required
                autoFocus
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              Use the email you signed up with. We never share it.
            </p>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileTap={{ scale: 0.98 }}
            className="w-full rounded-lg bg-linear-to-r from-cyan-400 to-blue-500 py-3 text-sm font-bold tracking-wide text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-300 hover:to-blue-400 disabled:opacity-50"
          >
            {loading ? 'Sending link...' : 'Send reset link'}
          </motion.button>
        </form>
      )}
    </AuthShell>
  );
}
