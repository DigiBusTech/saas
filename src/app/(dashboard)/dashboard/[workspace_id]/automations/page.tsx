import { getWorkspaceById } from '../../workspaces/actions';
import { getWorkspaceAutomations } from './actions';
import { AutomationsClient } from './automations-client';

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

  return <AutomationsClient workspace={workspace} initialAutomations={automations} />;
}
