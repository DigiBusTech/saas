import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

// DEPRECATED: Conversations are now workspace-scoped. Redirect to first workspace.
export default async function ConversationsRedirectPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
  if (!profile?.tenant_id) redirect('/dashboard');

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('tenant_id', profile.tenant_id)
    .eq('is_active', true)
    .order('created_at')
    .limit(1)
    .single();

  if (workspace) {
    redirect(`/dashboard/${workspace.id}/conversations`);
  }

  redirect('/dashboard');
}
