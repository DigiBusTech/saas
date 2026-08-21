'use client';

import { useState } from 'react';
import { login } from '../actions';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <AuthShell
      variant="login"
      title="Welcome back"
      subtitle="Sign in to manage conversations, orders, and your SabiBio page."
      footer={<span>Powered by Sabi AI Technologies Ltd.</span>}
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

      <form action={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Email address
          </label>
          <input
            type="email"
            name="email"
            placeholder="you@company.com"
            autoComplete="email"
            className="w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 transition-all focus:border-ring focus:ring-1 focus:ring-ring"
            required
            autoFocus
          />
        </div>

        <PasswordInput
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          required
        />

        <div className="flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" name="remember" className="h-3.5 w-3.5 accent-primary" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-primary hover:underline">
            Forgot password?
          </Link>
        </div>

        <motion.button
          type="submit"
          disabled={loading}
          whileTap={{ scale: 0.98 }}
          className="w-full rounded-lg bg-primary py-3 text-sm font-bold tracking-wide text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </motion.button>
      </form>

      <div className="mt-6 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="ml-1 font-medium text-primary hover:underline">
          Start a free trial →
        </Link>
      </div>
    </AuthShell>
  );
}
