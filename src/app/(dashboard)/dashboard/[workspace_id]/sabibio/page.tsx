import { getWorkspaceById } from '../../workspaces/actions';
import { getWorkspaceProducts } from '../products/actions';
import { getSabiBioConfig } from './actions';
import { SabiBioBuilder } from '@/components/dashboard/sabibio/SabiBioBuilder';
import { LinkIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

export default async function SabiBioPage({
  params,
}: {
  params: Promise<{ workspace_id: string }>;
}) {
  const { workspace_id } = await params;
  const [{ data: workspace }, { data: config, error }, { data: products }] = await Promise.all([
    getWorkspaceById(workspace_id),
    getSabiBioConfig(workspace_id),
    getWorkspaceProducts(workspace_id),
  ]);

  if (!workspace || !config || error) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-border bg-card">
        <p className="text-sm text-muted-foreground">SabiBio workspace configuration is unavailable.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="SabiBio Page Builder"
        subtitle="Your public link-in-bio page. Products, services, articles, checkout, and web chat — all under one link."
        icon={<LinkIcon className="h-5 w-5" />}
        guide={{
          what: 'SabiBio is a public storefront tied to this workspace. Anyone can visit the link, browse products and services, chat with your AI, and check out.',
          how: 'Pick a theme, choose which products and services to show, then share the SabiBio link on your social profiles, WhatsApp, and email signature.',
          tips: [
            'Only products marked "active" appear on the page.',
            'Add a hero headline that speaks to what you sell — first-time visitors decide in seconds.',
            'The embedded chat widget uses the same knowledge base as your inbox.',
            'You can preview the page before publishing changes.',
          ],
        }}
      />
      <SabiBioBuilder workspace={workspace} products={products ?? []} initialConfig={config} />
    </div>
  );
}
