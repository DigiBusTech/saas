import { getWorkspaceById } from '../../workspaces/actions';
import { getWorkspaceProducts } from './actions';
import { ProductsClient } from './products-client';

export default async function WorkspaceProductsPage({
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

  const { data: products } = await getWorkspaceProducts(workspace_id);

  return <ProductsClient workspace={workspace} initialProducts={products} />;
}
