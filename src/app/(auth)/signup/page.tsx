'use client';

import { useState, useEffect } from 'react';
import { signup } from '../actions';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, Building2, Mail, User } from 'lucide-react';
import { AuthShell } from '@/components/auth/AuthShell';
import { PasswordInput } from '@/components/auth/PasswordInput';
import { generateFingerprint, isFingerprintingSupported } from '@/lib/security/fingerprint';

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMatchError, setPasswordMatchError] = useState(false);

  // Generate browser fingerprint on mount (anti-abuse)
  useEffect(() => {
    if (isFingerprintingSupported()) {
      generateFingerprint()
        .then(setFingerprint)
        .catch(() => setFingerprint(null));
    }
  }, []);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    setPasswordMatchError(false);
    
    // Client-side password match validation
    const pwd = formData.get('password') as string;
    const confirmPwd = formData.get('confirmPassword') as string;
    
    if (pwd !== confirmPwd) {
      setPasswordMatchError(true);
      setError('Passwords do not match. Please ensure both password fields are identical.');
      setLoading(false);
      return;
    }
    
    // Attach fingerprint to form data
    if (fingerprint) {
      formData.set('browserFingerprint', fingerprint);
    }
    
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
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Full name
          </label>
          <div className="relative">
            <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="fullName"
              placeholder="Jane Doe"
              autoComplete="name"
              className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 transition-all focus:border-ring focus:ring-1 focus:ring-ring"
              required
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Business name
          </label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              name="tenantName"
              placeholder="Acme Trading Co."
              autoComplete="organization"
              className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 transition-all focus:border-ring focus:ring-1 focus:ring-ring"
              required
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">
            You can rename this later and create more workspaces per brand.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Work email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              autoComplete="email"
              className="w-full rounded-lg border border-input bg-background py-3 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 transition-all focus:border-ring focus:ring-1 focus:ring-ring"
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
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <PasswordInput
          label="Confirm Password"
          name="confirmPassword"
          placeholder="Re-enter your password"
          minLength={8}
          autoComplete="new-password"
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={passwordMatchError ? 'border-rose-500' : ''}
          required
        />

        <label className="flex items-start gap-2 pt-1 text-xs leading-5 text-muted-foreground">
          <input
            name="acceptedTerms"
            value="true"
            type="checkbox"
            required
            className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-primary"
          />
          <span>
            I agree to the SabiBio Terms of Service, Privacy Policy, and Cookie Policy.
          </span>
        </label>

        <motion.button
          type="submit"
          disabled={loading}
          whileTap={{ scale: 0.98 }}
          className="mt-2 w-full rounded-lg bg-primary py-3 text-sm font-bold tracking-wide text-primary-foreground shadow-lg transition-all hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Creating workspace...' : 'Start free trial'}
        </motion.button>
      </form>

      <div className="mt-6 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="ml-1 font-medium text-primary hover:underline">
          Sign in →
        </Link>
      </div>
    </AuthShell>
  );
}
