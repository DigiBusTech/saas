import { getWorkspaceById } from '../../workspaces/actions';
import { getWorkspaceProducts } from '../products/actions';
import { getSabiBioConfig } from './actions';
import { SabiBioBuilder } from '@/components/dashboard/sabibio/SabiBioBuilder';

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
      <div className="flex min-h-64 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/50">
        <p className="text-sm text-gray-500">SabiBio workspace configuration is unavailable.</p>
      </div>
    );
  }

  return <SabiBioBuilder workspace={workspace} products={products ?? []} initialConfig={config} />;
}
