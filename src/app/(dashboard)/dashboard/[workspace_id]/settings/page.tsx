import { getWorkspaceById } from '../../workspaces/actions';
import { SettingsClient } from './settings-client';
import { CategoryManager } from './category-manager';
import { getWorkspaceCategories } from './category-actions';

export default async function WorkspaceSettingsPage({
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

  const categories = await getWorkspaceCategories(workspace_id);

  return (
    <div className="space-y-6">
      <SettingsClient workspace={workspace} />
      <CategoryManager workspaceId={workspace_id} initialCategories={categories} />
    </div>
  );
}
