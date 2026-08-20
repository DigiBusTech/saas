import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { signOut } from '../(auth)/actions';
import { ThemeToggle } from '../theme-toggle';
import { WorkspaceSwitcher } from '@/components/dashboard/WorkspaceSwitcher';
import { DashboardNavGroup } from '@/components/dashboard/DashboardNavGroup';
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar';
import { getWorkspaces, getWorkspacePlanLimit } from './dashboard/workspaces/actions';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  // Use service client to bypass RLS for role lookup
  const svc = createServiceClient();
  const { data: profile } = await svc
    .from('users')
    .select('role, full_name, tenant_id')
    .eq('id', user.id)
    .single();

  // Super admins should use the super-admin console, not the tenant dashboard
  if (profile?.role === 'super_admin') redirect('/super-admin');

  const { data: tenant } = profile?.tenant_id
    ? await supabase.from('tenants').select('name, plan_type, status').eq('id', profile.tenant_id).single()
    : { data: null };

  // Fetch workspaces for switcher
  const { data: workspaces } = await getWorkspaces();
  const { maxWorkspaces, currentCount } = await getWorkspacePlanLimit();

  // Determine active workspace from URL (will be null on non-workspace pages)
  const activeWorkspaceId = null; // determined by child routes via params

  const globalNavItems = [
    { href: '/dashboard', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
    { href: '/dashboard/onboarding', label: 'Onboarding', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { href: '/dashboard/insights', label: 'Insights', icon: 'M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z' },
    { href: '/dashboard/billing', label: 'Billing', icon: 'M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM1 10h22' },
    { href: '/dashboard/account', label: 'Account & Data', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0' },
  ];

  // Build workspace-scoped nav items â€” the first workspace is the default context
  const firstWs = workspaces?.[0];
  const wsPrefix = firstWs ? `/dashboard/${firstWs.id}` : '/dashboard';

  const workspaceNavItems = [
    { href: `${wsPrefix}/conversations`, label: 'Conversations', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
    { href: `${wsPrefix}/inbox`, label: 'Inbox', icon: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z' },
    { href: `${wsPrefix}/knowledge`, label: 'Knowledge', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 19.5A2.5 2.5 0 0 0 6.5 22H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z' },
    { href: `${wsPrefix}/integrations`, label: 'Integrations', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
    { href: `${wsPrefix}/products`, label: 'Products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
    { href: `${wsPrefix}/services`, label: 'Services', icon: 'M20 7h-9m9 0a2 2 0 012 2v9a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2h2m11 0V5a2 2 0 00-2-2h-7a2 2 0 00-2 2v2' },
    { href: `${wsPrefix}/articles`, label: 'Articles', icon: 'M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5v14zM6.5 17H20' },
    { href: `${wsPrefix}/orders`, label: 'Orders', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm0 5c-2.76 0-5.07 1.29-6.63 3.29.98 1.47 2.45 2.57 4.13 3.13 1 .31 2.05.48 3.13.48s2.13-.17 3.13-.48c1.68-.56 3.15-1.66 4.13-3.13-1.56-2-3.87-3.29-6.63-3.29zM9 5C7.34 5 6 6.34 6 8s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 9c-2.33 0-4 1.34-4 3s1.67 3 4 3 4-1.34 4-3-1.67-3-4-3z' },
    { href: `${wsPrefix}/analytics`, label: 'Analytics', icon: 'M3 13h2v8H3zm4-8h2v16H7zm4-2h2v18h-2zm4-1h2v19h-2zm4 4h2v15h-2z' },
    { href: `${wsPrefix}/widget`, label: 'Widget', icon: 'M19 13h-6v6h6v-6zm0-6h-6v6h6V7zM9 13H3v6h6v-6zm0-6H3v6h6V7z' },
    { href: `${wsPrefix}/payments`, label: 'Payments', icon: 'M2 7h20M4 5h16a2 2 0 012 2v10a2 2 0 01-2 2H4a2 2 0 01-2-2V7a2 2 0 012-2zm3 9h3' },
    { href: `${wsPrefix}/crm`, label: 'CRM', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
    { href: `${wsPrefix}/automations`, label: 'Automations', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' },
      { href: `${wsPrefix}/sabibio`, label: 'SabiBio Page', icon: 'M12 3v18m9-9H3m14.5-6.5L6.5 17.5m0-11l11 11' },
    { href: `${wsPrefix}/settings`, label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-gray-300 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-zinc-950/80 backdrop-blur-md border-r border-white/5 flex flex-col shrink-0">
        {/* Brand */}
        <div className="h-14 border-b border-white/5 flex items-center px-4 gap-2.5">
          <div className="bg-linear-to-br from-cyan-400 to-blue-500 h-7 w-7 rounded-sm flex items-center justify-center font-bold text-slate-950 shadow-lg shadow-cyan-500/20 text-[10px]">
            SB
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{tenant?.name ?? 'SabiBio'}</p>
            <span className="text-[8px] text-cyan-300 bg-cyan-950/40 px-1.5 py-0.5 border border-cyan-900/40 rounded-full font-bold uppercase">
              {tenant?.plan_type ?? 'trial'}
            </span>
          </div>
        </div>

        {/* Workspace Switcher */}
        <div className="px-3 pt-3 pb-1">
          <WorkspaceSwitcher
            workspaces={workspaces ?? []}
            activeWorkspaceId={activeWorkspaceId}
            currentCount={currentCount}
            maxWorkspaces={maxWorkspaces}
          />
        </div>

        {/* Workspace Nav Links */}
        {firstWs && (
          <DashboardNavGroup title="Business" items={workspaceNavItems} />
        )}

        {/* Divider */}
        <div className="mx-3 my-1.5 border-t border-white/5" />

        {/* Global Nav Links */}
        <DashboardNavGroup title="Platform" items={globalNavItems} />

        <div className="flex-1" />

        {/* User Footer */}
        <div className="border-t border-white/5 p-3 space-y-2">
          <div className="flex items-center gap-2 px-2">
            <div className="w-6 h-6 rounded-full bg-linear-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center text-[9px] font-bold text-indigo-400">
              {(profile?.full_name ?? user.email ?? 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-white font-medium truncate">{profile?.full_name ?? user.email}</p>
              <p className="text-[8px] text-gray-600 uppercase tracking-wider">{profile?.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-2">
            <ThemeToggle />
          </div>
          <form action={signOut}>
            <button type="submit" className="w-full text-[10px] text-gray-500 hover:text-rose-400 py-1.5 px-2 border border-white/5 hover:border-rose-950/40 rounded-lg transition text-left">
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardTopbar />
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
