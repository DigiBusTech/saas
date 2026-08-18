import { getWorkspaceById } from '../../workspaces/actions';
import { getWorkspaceCRM, getCRMMetrics, getWorkspaceCategories } from './actions';
import { CRMClient } from './crm-client';

export default async function WorkspaceCRMPage({
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

  const [{ data: leads }, metrics, categories] = await Promise.all([
    getWorkspaceCRM(workspace_id),
    getCRMMetrics(workspace_id),
    getWorkspaceCategories(workspace_id),
  ]);

  return (
    <CRMClient
      workspace={workspace}
      initialLeads={leads}
      metrics={metrics}
      categories={categories}
    />
  );
}
