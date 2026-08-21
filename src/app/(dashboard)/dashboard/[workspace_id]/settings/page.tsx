import { getWorkspaceById } from '../../workspaces/actions';
import { SettingsClient } from './settings-client';
import { CategoryManager } from './category-manager';
import { getWorkspaceCategories } from './category-actions';
import { Settings } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

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
      <PageHeader
        title="Workspace Settings"
        subtitle="Configure workspace name, AI persona, categories, and access controls."
        icon={<Settings className="h-5 w-5" />}
        guide={{
          what: 'Everything workspace-specific lives here — the business name, the AI persona your customers hear, and the categories used to organize products and services.',
          how: 'Save changes at the bottom of each section. Category updates take effect immediately across the catalog and CRM.',
          tips: [
            'A clear AI persona ("friendly Nigerian fashion consultant") makes replies feel on-brand.',
            'Categories are shared across products, services, and the SabiBio page.',
            'You can create multiple workspaces (one per brand) from the workspace switcher.',
          ],
        }}
      />
      <SettingsClient workspace={workspace} />
      <CategoryManager workspaceId={workspace_id} initialCategories={categories} />
    </div>
  );
}
