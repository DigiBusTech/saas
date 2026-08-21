'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as LucideIcons from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide-react icon name
}

export function DashboardNavGroup({ title, items }: { title: string; items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="px-3 pt-2 pb-1 space-y-0.5">
      {title && (
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold px-3 pb-1">
          {title}
        </p>
      )}
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        const IconComponent = (LucideIcons as any)[item.icon] || LucideIcons.Circle;
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] transition-all duration-200 group ${
              active
                ? 'bg-primary/10 text-primary border border-primary/20 font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
            }`}
          >
            <IconComponent className={`w-4 h-4 shrink-0 transition ${
              active ? 'text-primary' : 'group-hover:text-primary'
            }`} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
