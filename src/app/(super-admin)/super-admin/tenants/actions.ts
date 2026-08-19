'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { revalidatePath } from 'next/cache';

export async function getTenants() {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { tenants: [], error: guard.error };
  const supabase = createServiceClient();

  let { data, error } = await supabase
    .from('tenants')
    .select(`
      id, name, status, plan_type, plan_id, is_suspended,
      message_usage, token_usage,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (error?.message.includes('is_suspended')) {
    const fallback = await supabase
      .from('tenants')
      .select('id, name, status, plan_type, plan_id, message_usage, token_usage, created_at')
      .order('created_at', { ascending: false });
    data = (fallback.data ?? []).map((tenant) => ({ ...tenant, is_suspended: false }));
    error = fallback.error;
  }

  if (error) return { tenants: [], error: error.message };

  // Enrich with workspace count and owner email
  const enriched = await Promise.all(
    (data ?? []).map(async (tenant) => {
      const { count: workspaceCount } = await supabase
        .from('workspaces')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id);

      const { data: owner } = await supabase
        .from('users')
        .select('email, full_name')
        .eq('tenant_id', tenant.id)
        .eq('role', 'owner')
        .limit(1)
        .maybeSingle();

      // Fallback: if no 'owner' role found, try 'tenant_admin'
      let ownerEmail = owner?.email;
      let ownerName = owner?.full_name;
      if (!ownerEmail) {
        const { data: admin } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('tenant_id', tenant.id)
          .eq('role', 'tenant_admin')
          .limit(1)
          .maybeSingle();
        ownerEmail = admin?.email;
        ownerName = admin?.full_name;
      }

      return {
        ...tenant,
        workspace_count: workspaceCount ?? 0,
        owner_email: ownerEmail ?? 'N/A',
        owner_name: ownerName ?? '',
      };
    })
  );

  return { tenants: enriched, error: null };
}

export async function getPlansForDropdown() {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return [];
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('subscription_plans')
    .select('id, name, slug, max_workspaces')
    .eq('is_active', true)
    .order('sort_order');
  return data ?? [];
}

export async function updateTenant(formData: FormData) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const id = formData.get('id') as string;
  if (!id) return { error: 'Missing tenant ID' };

  const supabase = createServiceClient();

  const updates: Record<string, any> = {};

  const planId = formData.get('plan_id') as string;
  if (planId) updates.plan_id = planId;

  const messageUsage = formData.get('message_usage');
  if (messageUsage !== null && messageUsage !== '') {
    updates.message_usage = parseInt(messageUsage as string, 10);
  }

  const tokenUsage = formData.get('token_usage');
  if (tokenUsage !== null && tokenUsage !== '') {
    updates.token_usage = parseInt(tokenUsage as string, 10);
  }

  if (Object.keys(updates).length === 0) return { error: 'No changes provided' };

  const { error } = await supabase.from('tenants').update(updates).eq('id', id);
  if (error) return { error: error.message };

  revalidatePath('/super-admin/tenants');
  return { error: null };
}

export async function suspendTenant(tenantId: string, suspend: boolean) {
  if (!tenantId) return { error: 'Missing tenant ID' };
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from('tenants')
    .update({ is_suspended: suspend })
    .eq('id', tenantId);

  if (error) return { error: error.message };

  revalidatePath('/super-admin/tenants');
  return { error: null };
}
