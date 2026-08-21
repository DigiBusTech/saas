import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { signOut } from '../(auth)/actions';
import { ThemeToggle } from '../theme-toggle';
import { WorkspaceSwitcher } from '@/components/dashboard/WorkspaceSwitcher';
import { DashboardNavGroup } from '@/components/dashboard/DashboardNavGroup';
import { DashboardNavGroups } from '@/components/dashboard/DashboardNavGroups';
import { DashboardMobileNav } from '@/components/dashboard/DashboardMobileNav';
import { DashboardTopbar } from '@/components/dashboard/DashboardTopbar';
import { getWorkspaces, getWorkspacePlanLimit } from './dashboard/workspaces/actions';
import { getWorkspaceNavGroups } from '@/lib/dashboard-nav-config';
import { BrandMark } from '@/components/ui/BrandMark';

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


  // Build workspace-scoped nav groups â€" the first workspace is the default context
  const firstWs = workspaces?.[0];
  const wsPrefix = firstWs ? `/dashboard/${firstWs.id}` : '/dashboard';
  const workspaceNavGroups = getWorkspaceNavGroups(wsPrefix);

  const globalNavItems = [
    { href: '/dashboard', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1' },
    { href: '/dashboard/onboarding', label: 'Onboarding', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { href: '/dashboard/insights', label: 'Insights', icon: 'M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z' },
    { href: '/dashboard/billing', label: 'Billing', icon: 'M21 4H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM1 10h22' },
    { href: '/dashboard/account', label: 'Account & Data', icon: 'M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0' },
  ];
  return (
    <div className="min-h-screen bg-zinc-950 text-gray-300 lg:flex">
      {/* Sidebar */}
      <aside className="hidden w-72 bg-zinc-950/80 backdrop-blur-md border-r border-white/5 lg:flex lg:flex-col lg:shrink-0">
        {/* Brand */}
        <div className="h-14 border-b border-white/5 flex items-center px-4 gap-2.5">
          <BrandMark fallbackText="SB" size="sm" />
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

        {/* Workspace Nav Groups - Organized into 5 categories */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
          {firstWs && (
            <DashboardNavGroups groups={workspaceNavGroups} collapsible={true} />
          )}

          {/* Divider */}
          <div className="border-t border-white/5" />

          {/* Global Nav Links */}
          <div>
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              🏢 Platform
            </p>
            <DashboardNavGroup title="" items={globalNavItems} />
          </div>
        </nav>

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

      <DashboardMobileNav groups={workspaceNavGroups} />

      {/* Main Content */}
      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <DashboardTopbar />
        <main className="flex-1 overflow-auto">
          <div className="px-4 py-6 pt-20 sm:px-6 lg:p-8 lg:pt-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
