 import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { signOut } from '../(auth)/actions';
import { ThemeToggle } from '../theme-toggle';
import { SuperAdminNav } from '@/components/super-admin/SuperAdminNav';
import { SuperAdminTopbar } from '@/components/super-admin/SuperAdminTopbar';
import { SuperAdminMobileNav } from '@/components/super-admin/SuperAdminMobileNav';
import { BrandMark } from '@/components/ui/BrandMark';

export default async function SuperAdminLayout({
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
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-zinc-950 text-gray-300 lg:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 bg-zinc-950/80 backdrop-blur-md border-r border-white/5 lg:flex lg:flex-col lg:shrink-0">
        {/* Brand */}
        <div className="h-14 border-b border-white/5 flex items-center px-4 gap-2.5">
          <BrandMark fallbackText="SA" gradient="from-rose-500 to-rose-700" size="sm" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">SabiBio Admin</p>
            <span className="text-[8px] text-rose-400 bg-rose-950/40 px-1.5 py-0.5 border border-rose-900/30 rounded-full font-bold uppercase">
              Platform Owner
            </span>
          </div>
        </div>

        <SuperAdminNav />

        {/* User Footer */}
        <div className="border-t border-white/5 p-3 space-y-2">
          <div className="flex items-center gap-2 px-2">
            <div className="w-6 h-6 rounded-full bg-linear-to-br from-rose-500/20 to-rose-700/20 border border-rose-500/20 flex items-center justify-center text-[9px] font-bold text-rose-400">
              {(profile?.full_name ?? user.email ?? 'U')[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-white font-medium truncate">{profile?.full_name ?? user.email}</p>
              <p className="text-[8px] text-gray-600 uppercase tracking-wider">super_admin</p>
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

      <SuperAdminMobileNav />

      {/* Main Content */}
      <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
        <SuperAdminTopbar />
        <main className="flex-1 overflow-auto">
          <div className="px-4 py-6 pt-20 sm:px-6 lg:p-8 lg:pt-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
