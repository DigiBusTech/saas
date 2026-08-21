import { getWorkspaceById } from '../../workspaces/actions';
import { getWorkspaceAutomations } from './actions';
import { AutomationsClient } from './automations-client';
import { Zap } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function WorkspaceAutomationsPage({
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

  const { data: automations } = await getWorkspaceAutomations(workspace_id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flash Sales & Broadcasts"
        subtitle="Schedule announcements, promotions, and reminders that go out on WhatsApp and Telegram automatically."
        icon={<Zap className="h-5 w-5" />}
        guide={{
          what: 'Automations send timely, personalized messages to segments of your contacts — flash sales, restock alerts, renewal reminders, and post-purchase drips.',
          how: 'Create a broadcast, pick the audience, write the message, and choose when to send. The system handles delivery, retries, and rate-limits per channel.',
          tips: [
            'Segment by tags, purchase history, or channel to keep messages relevant.',
            'Schedule broadcasts during business hours in your customers\' timezone.',
            'Every message respects WhatsApp\'s 24-hour session and template rules.',
            'Track opens, replies, and conversions from the Analytics page.',
          ],
        }}
      />
      <AutomationsClient workspace={workspace} initialAutomations={automations} />
    </div>
  );
}
