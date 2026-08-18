import { createClient, createServiceClient } from '@/lib/supabase/server';

/**
 * Verifies the current session belongs to a super_admin user.
 * Every super-admin server action must call this before touching data,
 * since the service-role client otherwise bypasses RLS entirely.
 */
export async function requireSuperAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') return { error: 'Forbidden: super admin access required' };
  return { userId: user.id };
}

/** Resolves the caller's tenant_id, or an error if unauthenticated / no tenant. */
export async function requireTenant(): Promise<{ userId: string; tenantId: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (!profile?.tenant_id) return { error: 'No tenant found' };
  return { userId: user.id, tenantId: profile.tenant_id };
}
