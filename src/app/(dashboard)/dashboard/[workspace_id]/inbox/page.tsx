import { getInboxConversations } from './actions';
import { InboxClient } from './inbox-client';

export default async function InboxPage({
  params,
}: {
  params: Promise<{ workspace_id: string }>;
}) {
  const { workspace_id } = await params;
  const conversations = await getInboxConversations(workspace_id);

  return <InboxClient workspaceId={workspace_id} initialConversations={conversations} />;
}
