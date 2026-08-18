'use client';

import { useState } from 'react';
import { signup } from '../actions';
import Link from 'next/link';
import { motion } from 'framer-motion';

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
    <div className="min-h-screen bg-[#081018] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-zinc-900/60 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white tracking-tight mb-2">
            Create Account
          </h2>
          <p className="text-xs text-slate-400">
            Start your 14-day free trial on SabiBio
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            className="mb-6 p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg flex items-center gap-2"
          >
            <span>{error}</span>
          </motion.div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-2">
              Full Name
            </label>
            <input
              type="text"
              name="fullName"
              placeholder="John Doe"
              className="w-full bg-black/40 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 outline-none text-white transition-all placeholder:text-slate-600"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-2">
              Business Name
            </label>
            <input
              type="text"
              name="tenantName"
              placeholder="Acme Corp"
              className="w-full bg-black/40 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 outline-none text-white transition-all placeholder:text-slate-600"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              className="w-full bg-black/40 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 outline-none text-white font-mono transition-all placeholder:text-slate-600"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-500 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="Min 8 characters"
              className="w-full bg-black/40 border border-slate-700/50 rounded-lg px-4 py-2.5 text-sm focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 outline-none text-white transition-all placeholder:text-slate-600"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 disabled:opacity-50 transition-all text-slate-950 py-3 rounded-lg font-bold text-sm tracking-wide shadow-lg shadow-cyan-500/20"
          >
            {loading ? 'Creating...' : 'Sign Up & Start Trial'}
          </button>
          <label className="flex items-start gap-2 text-[10px] leading-4 text-slate-500">
            <input name="acceptedTerms" value="true" type="checkbox" required className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-cyan-400" />
            <span>I agree to the SabiBio Terms of Service, Privacy Policy, Disclaimer, and Cookie Policy.</span>
          </label>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-700/50 text-center">
          <p className="text-xs text-slate-400 mb-3">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-medium ml-1 transition-colors">
              Sign in →
            </Link>
          </p>
          <p className="text-[10px] text-slate-600">
            Powered by Sabi AI Technologies Ltd.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
