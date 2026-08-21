'use client';

import { usePathname } from 'next/navigation';
import { pageTitleFromPathname } from './SuperAdminNav';

export function SuperAdminTopbar() {
  const pathname = usePathname();
  const title = pageTitleFromPathname(pathname ?? '');

  return (
    <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b border-white/5 bg-zinc-950/60 pl-20 pr-4 backdrop-blur-md sm:pl-20 sm:pr-6 lg:h-12 lg:pl-6 lg:pr-8">
      <h1 className="text-xs font-semibold text-white">{title}</h1>
      <span className="mx-2 text-gray-700">/</span>
      <span className="text-[10px] text-gray-500">Super Admin Console</span>
    </div>
  );
}
