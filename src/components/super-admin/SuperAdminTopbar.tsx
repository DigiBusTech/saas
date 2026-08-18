'use client';

import { usePathname } from 'next/navigation';
import { pageTitleFromPathname } from './SuperAdminNav';

export function SuperAdminTopbar() {
  const pathname = usePathname();
  const title = pageTitleFromPathname(pathname ?? '');

  return (
    <div className="h-12 border-b border-white/5 bg-zinc-950/60 backdrop-blur-md flex items-center px-6 shrink-0">
      <h1 className="text-xs font-semibold text-white">{title}</h1>
      <span className="mx-2 text-gray-700">/</span>
      <span className="text-[10px] text-gray-500">Super Admin Console</span>
    </div>
  );
}
