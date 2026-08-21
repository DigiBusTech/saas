import { createClient } from '@/lib/supabase/server';
import { KnowledgeClient } from './knowledge-client';
import { notFound } from 'next/navigation';
import { BookOpen } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

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

  const docs = (documents ?? []).map((d) => ({
    id: d.id as string,
    title: d.title as string,
    content: d.content as string,
    created_at: d.created_at as string,
    has_embedding: !!d.embedding,
    status: (d.status ?? null) as string | null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        subtitle="Documents your AI uses to answer customers. Upload anything you'd want a new teammate to know."
        icon={<BookOpen className="h-5 w-5" />}
        guide={{
          what: 'Your knowledge base grounds every AI reply. Each document is chunked and vector-indexed so the assistant can quote your policies, FAQs, and product details.',
          how: 'Paste text, upload files, or add articles. The AI will retrieve the most relevant chunks for each customer question and only answer from what it finds.',
          tips: [
            'Add clear titles — the AI uses them to match questions.',
            'Keep documents short and focused on one topic each.',
            'Update pricing, policies, and hours whenever they change.',
            'A green dot means the document has been indexed and is live.',
          ],
        }}
      />
      <KnowledgeClient documents={docs} workspaceId={workspace_id} />
    </div>
  );
}
