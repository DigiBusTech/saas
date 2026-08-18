import Link from 'next/link';

export function MarketingNav() {
  return (
    <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 lg:px-8">
      <Link href="/" className="text-lg font-semibold tracking-tight text-white">
        rgist<span className="text-cyan-300">plus</span>
      </Link>
      <div className="hidden items-center gap-7 text-sm text-slate-400 md:flex">
        <Link href="/#how-it-works" className="hover:text-white">How it works</Link>
        <Link href="/pricing" className="hover:text-white">Pricing</Link>
        <Link href="/docs" className="hover:text-white">Documentation</Link>
        <Link href="/#faq" className="hover:text-white">FAQ</Link>
        <Link href="/contact" className="hover:text-white">Contact</Link>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <Link href="/login" className="hidden text-slate-300 hover:text-white sm:block">Log in</Link>
        <Link href="/signup" className="rounded-full bg-cyan-300 px-4 py-2 font-semibold text-slate-950 hover:bg-cyan-200">Start free</Link>
      </div>
    </nav>
  );
}

export function MarketingFooter() {
  return (
    <footer className="border-t border-slate-800">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Link href="/" className="text-lg font-semibold tracking-tight text-white">
              rgist<span className="text-cyan-300">plus</span>
            </Link>
            <p className="mt-3 text-xs leading-6 text-slate-500">
              AI-assisted customer conversations, CRM, and automation for WhatsApp and Telegram.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Product</p>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><Link href="/#how-it-works" className="hover:text-white">How it works</Link></li>
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
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-6 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} SabiBio. All rights reserved.</span>
          <span>Live conversations. Better operations.</span>
        </div>
      </div>
    </footer>
  );
}
