'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export function DashboardNavGroup({ title, items }: { title: string; items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="px-3 pt-2 pb-1 space-y-0.5">
      <p className="text-[9px] uppercase tracking-widest text-gray-600 font-semibold px-3 pb-1">{title}</p>
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[11px] transition-all duration-200 group ${
              active
                ? 'bg-indigo-500/10 text-white border border-indigo-500/20'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <svg className={`w-3.5 h-3.5 transition ${active ? 'text-indigo-400' : 'text-gray-600 group-hover:text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
