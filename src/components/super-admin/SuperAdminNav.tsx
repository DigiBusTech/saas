'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  KeyRound,
  Mail,
  FileText,
  Cpu,
  Activity,
  BarChart3,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/super-admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/super-admin/tenants', label: 'Tenants', icon: Building2 },
  { href: '/super-admin/plans', label: 'Plans', icon: CreditCard },
  { href: '/super-admin/configs', label: 'Configs', icon: KeyRound },
  { href: '/super-admin/emails', label: 'Emails', icon: Mail },
  { href: '/super-admin/cms', label: 'CMS', icon: FileText },
  { href: '/super-admin/ai-providers', label: 'AI Providers', icon: Cpu },
  { href: '/super-admin/observability', label: 'Observability', icon: Activity },
  { href: '/super-admin/analytics', label: 'Analytics', icon: BarChart3 },
];

export function SuperAdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 space-y-0.5 pt-3">
      <p className="text-[9px] uppercase tracking-widest text-gray-600 font-semibold px-3 pb-1">Platform Console</p>
      {NAV_ITEMS.map((item) => {
        const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] transition-all duration-200 group ${
              active
                ? 'bg-rose-500/10 text-white border border-rose-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 transition ${active ? 'text-rose-400' : 'text-gray-600 group-hover:text-rose-400'}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function pageTitleFromPathname(pathname: string): string {
  const segments = pathname.replace(/^\/super-admin\/?/, '').split('/').filter(Boolean);
  if (segments.length === 0) return 'Overview';
  return segments[0]
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}
