import { createClient } from '@/lib/supabase/server';
import { KnowledgeClient } from './knowledge-client';
import { notFound } from 'next/navigation';

export default async function WorkspaceKnowledgePage({
  params,
}: {
  params: { workspace_id: string };
}) {
  const { workspace_id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user!.id)
    .single();

  // Verify workspace belongs to tenant
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name')
    .eq('id', workspace_id)
    .eq('tenant_id', profile!.tenant_id!)
    .single();

  if (!workspace) notFound();

  const { data: documents } = await supabase
    .from('knowledge_bases')
    .select('id, title, content, created_at, embedding, status')
    .eq('tenant_id', profile!.tenant_id!)
    .eq('workspace_id', workspace_id)
    .order('created_at', { ascending: false });

  const docs = (documents ?? []).map((d: any) => ({
    id: d.id,
    title: d.title,
    content: d.content,
    created_at: d.created_at,
    has_embedding: !!d.embedding,
    status: d.status ?? null,
  }));

  return <KnowledgeClient documents={docs} workspaceId={workspace_id} />;
}
