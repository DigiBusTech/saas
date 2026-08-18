'use client';

import { usePathname } from 'next/navigation';

function titleFromPathname(pathname: string): string {
  const withoutWorkspace = pathname.replace(/^\/dashboard\/[0-9a-f-]{36}/i, '');
  const segments = withoutWorkspace.replace(/^\/dashboard\/?/, '').split('/').filter(Boolean);
  if (segments.length === 0) return 'Overview';
  return segments[0]
    .split('-')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

export function DashboardTopbar() {
  const pathname = usePathname();
  const title = titleFromPathname(pathname ?? '');

  return (
    <div className="h-12 border-b border-white/5 bg-zinc-950/60 backdrop-blur-md flex items-center px-6 shrink-0 sticky top-0 z-10">
      <h1 className="text-xs font-semibold text-white">{title}</h1>
      <span className="mx-2 text-gray-700">/</span>
      <span className="text-[10px] text-gray-500">Dashboard</span>
    </div>
  );
}
