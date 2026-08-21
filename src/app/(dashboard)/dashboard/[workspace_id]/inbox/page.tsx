import { getInboxConversations } from './actions';
import { InboxClient } from './inbox-client';
import { Inbox } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function InboxPage({
  params,
}: {
  params: Promise<{ workspace_id: string }>;
}) {
  const { workspace_id } = await params;
  const conversations = await getInboxConversations(workspace_id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unified Inbox"
        subtitle="Every WhatsApp, Telegram, and web chat conversation, in one place. Reply, escalate, or let the AI handle it."
        icon={<Inbox className="h-5 w-5" />}
        defaultCollapsed
        guide={{
          what: 'The inbox streams every incoming and outgoing message across channels in real time. Each thread shows the customer, channel, and current AI mode.',
          how: 'Click any conversation to open it. Toggle Autopilot, Copilot, or Manual mode per thread. Reply as a human, add notes, or convert the visitor to a lead.',
          tips: [
            'Autopilot — the AI replies without waiting for you.',
            'Copilot — the AI drafts a reply; you approve before sending.',
            'Manual — the AI stays quiet; you handle it entirely.',
            'A red dot means the sentiment guardrail escalated the chat to a human.',
          ],
        }}
      />
      <InboxClient workspaceId={workspace_id} initialConversations={conversations} />
    </div>
  );
}
