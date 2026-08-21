import { createClient } from '@/lib/supabase/server';
import { getWorkspaceById } from '../../workspaces/actions';
import { ConversationsClient } from './conversations-client';
import { MessageSquare } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

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

  const { data: conversations } = await supabase
    .from('conversations')
    .select('*, messages(id, sender_type, content, approval_status, created_at)')
    .eq('workspace_id', workspace_id)
    .order('updated_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <PageHeader
        title="All Conversations"
        subtitle="Full chat history across every channel. Review AI performance, sentiment trends, and handoffs."
        icon={<MessageSquare className="h-5 w-5" />}
        guide={{
          what: 'This is the archive of every conversation across WhatsApp, Telegram, and web chat. Filter by channel, AI mode, or status.',
          how: 'Open a thread to see the full message log with sender, timestamps, and approval status for Copilot drafts.',
          tips: [
            'For active conversations, use the Unified Inbox instead — it updates in real time.',
            'Paused threads mean the AI is off and waiting for a human.',
            'Message-approval status shows Copilot drafts that were approved, edited, or rejected.',
          ],
        }}
      />
      <ConversationsClient
        workspace={workspace}
        initialConversations={conversations ?? []}
      />
    </div>
  );
}
