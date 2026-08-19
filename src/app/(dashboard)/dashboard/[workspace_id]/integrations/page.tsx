import { getWorkspaceById, getWorkspaceIntegrationStatus } from '../../workspaces/actions';
import { WorkspaceIntegrationsClient } from './integrations-client';
import { getPublicAppUrl } from '@/lib/app-url';

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
    <WorkspaceIntegrationsClient
      workspace={workspace}
      integrationStatus={integrationStatus}
      publicAppUrl={publicAppUrl}
    />
  );
}
