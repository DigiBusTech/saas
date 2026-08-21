import { getWorkspaceById, getWorkspaceIntegrationStatus } from '../../workspaces/actions';
import { WorkspaceIntegrationsClient } from './integrations-client';
import { getPublicAppUrl } from '@/lib/app-url';
import { Plug } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function WorkspaceIntegrationsPage({
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

  const [integrationStatus, publicAppUrl] = await Promise.all([
    getWorkspaceIntegrationStatus(workspace_id),
    getPublicAppUrl(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Integrations"
        subtitle="Connect WhatsApp, Telegram, and your AI providers so this workspace can send and receive real messages."
        icon={<Plug className="h-5 w-5" />}
        guide={{
          what: 'Integrations let your workspace talk to the outside world. Each channel and AI provider has its own credentials and webhook URLs.',
          how: 'Paste your WhatsApp Cloud API token, Telegram bot token, or LLM API key into the matching card. Copy the webhook URL back into the provider dashboard so incoming messages reach us.',
          tips: [
            'WhatsApp requires a verified Meta business account and a phone number ID.',
            'Telegram bot tokens are created via @BotFather. Paste the token and hit save.',
            'You can override the platform AI provider per workspace to test different models.',
            'A green pill means the credentials were validated and are live.',
          ],
        }}
      />
      <WorkspaceIntegrationsClient
        workspace={workspace}
        integrationStatus={integrationStatus}
        publicAppUrl={publicAppUrl}
      />
    </div>
  );
}
