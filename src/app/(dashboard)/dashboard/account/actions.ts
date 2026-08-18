'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function requestAccountDeletion() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { error: 'Unauthorized' };
  const service = createServiceClient();
  const { data: profile } = await service.from('users').select('tenant_id').eq('id', user.id).single();
  if (!profile?.tenant_id) return { error: 'Tenant not found' };
  const deletedAt = new Date().toISOString();
  const { error } = await service.from('tenants').update({ status: 'suspended', deletion_requested_at: deletedAt, deleted_at: deletedAt }).eq('id', profile.tenant_id);
  if (error) return { error: error.message };
  await db.auth.signOut();
  redirect('/login?deleted=1');
}
