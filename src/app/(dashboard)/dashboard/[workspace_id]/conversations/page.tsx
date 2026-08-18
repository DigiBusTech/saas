import { createClient } from '@/lib/supabase/server';
import { getWorkspaceById } from '../../workspaces/actions';
import { ConversationsClient } from './conversations-client';

export default async function WorkspaceConversationsPage({
  params,
}: {
  params: Promise<{ workspace_id: string }>;
}) {
  const { workspace_id } = await params;
  const { data: workspace } = await getWorkspaceById(workspace_id);

  if (!workspace) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500 text-sm">Workspace not found.</p>
      </div>
    );
  }

  const supabase = await createClient();

  // Fetch conversations with message counts
  const { data: conversations } = await supabase
    .from('conversations')
    .select('*, messages(id, sender_type, content, approval_status, created_at)')
    .eq('workspace_id', workspace_id)
    .order('updated_at', { ascending: false })
    .limit(50);

  return (
    <ConversationsClient
      workspace={workspace}
      initialConversations={conversations ?? []}
    />
  );
}
