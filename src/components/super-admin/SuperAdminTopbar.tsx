'use client';

import { usePathname } from 'next/navigation';
import { pageTitleFromPathname } from './SuperAdminNav';
import { ThemeToggle } from '@/app/theme-toggle';

export function SuperAdminTopbar() {
  const pathname = usePathname();
  const title = pageTitleFromPathname(pathname ?? '');

  return (
    <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/80 pl-20 pr-4 backdrop-blur-md sm:pl-20 sm:pr-6 lg:h-12 lg:pl-6 lg:pr-8">
      <div className="flex items-center">
        <h1 className="text-xs font-semibold text-foreground">{title}</h1>
        <span className="mx-2 text-muted-foreground/60">/</span>
        <span className="text-[10px] text-muted-foreground">Super Admin Console</span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle size="sm" />
      </div>
    </div>
  );
}
