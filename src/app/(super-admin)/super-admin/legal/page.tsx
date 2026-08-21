import { createServiceClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import LegalCmsClient from './legal-cms-client';

export default async function SuperAdminLegalPage() {
  const db = createServiceClient();
  
  // Super Admin auth check
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await db
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'super_admin') redirect('/dashboard');

  // Fetch existing legal content
  const { data: legalContent } = await db
    .from('global_legal_content')
    .select('*')
    .order('content_type', { ascending: true })
    .order('updated_at', { ascending: false });

  return <LegalCmsClient initialContent={legalContent ?? []} />;
}
