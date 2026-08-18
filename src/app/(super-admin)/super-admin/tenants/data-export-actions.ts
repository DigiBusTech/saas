'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { requireSuperAdmin } from '@/lib/auth/guards';

export async function exportTenantData(tenantId: string) {
  const guard = await requireSuperAdmin();
  if ('error' in guard) return { error: guard.error };
  const db = createServiceClient();
  const [{ data: tenant }, { data: users }, { data: workspaces }, { data: conversations }, { data: messages }, { data: articles }] = await Promise.all([
    db.from('tenants').select('*').eq('id', tenantId).single(),
    db.from('users').select('id, tenant_id, role, email, full_name, created_at').eq('tenant_id', tenantId),
    db.from('workspaces').select('*').eq('tenant_id', tenantId),
    db.from('conversations').select('*').eq('tenant_id', tenantId),
    db.from('messages').select('*').in('conversation_id', (await db.from('conversations').select('id').eq('tenant_id', tenantId)).data?.map((row) => row.id) ?? []),
    db.from('workspace_articles').select('*').in('workspace_id', (await db.from('workspaces').select('id').eq('tenant_id', tenantId)).data?.map((row) => row.id) ?? []),
  ]);
  return { data: { tenant, users, workspaces, conversations, messages, articles } };
}
