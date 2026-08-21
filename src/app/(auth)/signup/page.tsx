'use client';

import { useState } from 'react';
import { signup } from '../actions';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, Building2, Mail, User } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signup(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      variant="signup"
      title="Create your workspace"
      subtitle="Start a 14-day trial. No credit card required."
      footer={
        <span>
          By continuing you agree to the{' '}
          <Link href="/legal/terms" className="text-cyan-300 hover:text-cyan-200">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="text-cyan-300 hover:text-cyan-200">
            Privacy Policy
          </Link>
          .
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

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Full name
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              name="fullName"
              placeholder="Jane Doe"
              autoComplete="name"
              className="w-full rounded-lg border border-slate-700/50 bg-black/40 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 transition-all focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20"
              required
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Business name
          </label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              name="tenantName"
              placeholder="Acme Trading Co."
              autoComplete="organization"
              className="w-full rounded-lg border border-slate-700/50 bg-black/40 py-3 pl-10 pr-3 text-sm text-white outline-none placeholder:text-slate-600 transition-all focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20"
              required
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            You can rename this later and create more workspaces per brand.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Work email
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
            />
          </div>
        </div>

        <PasswordInput
          label="Password"
          name="password"
          placeholder="At least 8 characters"
          minLength={8}
          autoComplete="new-password"
          helperText="Use 8+ characters with a mix of letters and numbers."
          required
        />

        <label className="flex items-start gap-2 pt-1 text-xs leading-5 text-slate-400">
          <input
            name="acceptedTerms"
            value="true"
            type="checkbox"
            required
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-cyan-400"
          />
          <span>
            I agree to the SabiBio Terms of Service, Privacy Policy, and Cookie Policy.
          </span>
        </label>

        <motion.button
          type="submit"
          disabled={loading}
          whileTap={{ scale: 0.98 }}
          className="mt-2 w-full rounded-lg bg-linear-to-r from-cyan-400 to-blue-500 py-3 text-sm font-bold tracking-wide text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:from-cyan-300 hover:to-blue-400 disabled:opacity-50"
        >
          {loading ? 'Creating workspace...' : 'Start free trial'}
        </motion.button>
      </form>

      <div className="mt-6 border-t border-white/10 pt-6 text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="ml-1 font-medium text-cyan-300 hover:text-cyan-200">
          Sign in →
        </Link>
      </div>
    </AuthShell>
  );
}
