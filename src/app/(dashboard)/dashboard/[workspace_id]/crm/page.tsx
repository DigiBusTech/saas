import { getWorkspaceById } from '../../workspaces/actions';
import { getWorkspaceCRM, getCRMMetrics, getWorkspaceCategories } from './actions';
import { CRMClient } from './crm-client';
import { Users } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

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
    <div className="space-y-6">
      <PageHeader
        title="Contacts & Leads CRM"
        subtitle="Every customer who has ever messaged you, organized with tags, sentiment, and lifecycle stage."
        icon={<Users className="h-5 w-5" />}
        guide={{
          what: 'The CRM auto-populates from every channel. Each contact holds message history, sentiment score, tags, order history, and lifecycle stage.',
          how: 'Use the filters to segment. Tag contacts to power broadcasts. Click any lead to see full history and add internal notes your team can share.',
          tips: [
            'Tags drive segmentation for flash sales and broadcasts.',
            'Angry-sentiment contacts are highlighted so you can follow up personally.',
            'Export a segment to CSV to import into other tools.',
          ],
        }}
      />
      <CRMClient
        workspace={workspace}
        initialLeads={leads}
        metrics={metrics}
        categories={categories}
      />
    </div>
  );
}
