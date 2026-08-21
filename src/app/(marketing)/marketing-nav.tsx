'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#live-demo', label: 'Live demo' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/docs', label: 'Docs' },
  { href: '/#faq', label: 'FAQ' },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#050914]/80 backdrop-blur-xl">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-white"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-cyan-400 to-blue-500 text-xs font-bold text-slate-950 shadow-lg shadow-cyan-500/20">
            SB
          </span>
          SabiBio
        </Link>

        <div className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
          {LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-white">
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 text-sm md:flex">
          <Link href="/login" className="text-slate-300 hover:text-white">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-cyan-300 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-200"
          >
            Start free
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              className="fixed inset-y-0 right-0 z-50 w-[min(86vw,20rem)] border-l border-white/10 bg-[#050914] px-5 py-5 md:hidden"
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">Menu</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-300 hover:bg-white/5"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-1">
                {LINKS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-200 hover:bg-white/5"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="mt-6 space-y-2 border-t border-white/10 pt-6">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg border border-white/10 px-3 py-3 text-center text-sm font-semibold text-white hover:border-cyan-300 hover:text-white"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="block rounded-lg bg-cyan-300 px-3 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-cyan-200"
                >
                  Start free
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/5 bg-[#050914]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight text-white"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-cyan-400 to-blue-500 text-xs font-bold text-slate-950">
                SB
              </span>
              SabiBio
            </Link>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              AI-assisted customer conversations, CRM, and automation for WhatsApp and Telegram.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><Link href="/#features" className="hover:text-white">Features</Link></li>
              <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link href="/#faq" className="hover:text-white">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Resources</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
              <li><Link href="/contact" className="hover:text-white">Contact support</Link></li>
              <li><Link href="/signup" className="hover:text-white">Create a workspace</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Account</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><Link href="/login" className="hover:text-white">Log in</Link></li>
              <li><Link href="/signup" className="hover:text-white">Sign up</Link></li>
              <li><Link href="/forgot-password" className="hover:text-white">Reset password</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-white/5 pt-6 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} SabiBio. All rights reserved.</span>
          <span>Live conversations. Better operations.</span>
        </div>
      </div>
    </footer>
  );
}
