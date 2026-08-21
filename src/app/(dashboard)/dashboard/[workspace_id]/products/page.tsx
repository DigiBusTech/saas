import { getWorkspaceById } from '../../workspaces/actions';
import { getWorkspaceProducts } from './actions';
import { ProductsClient } from './products-client';
import { Package } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products Catalog"
        subtitle="Everything you sell. Prices, codes, and links your AI can share directly in conversations."
        icon={<Package className="h-5 w-5" />}
        guide={{
          what: 'Products appear on your SabiBio page, in AI replies, and in checkout. Each product has a code the AI can look up when a customer asks about it.',
          how: 'Add a product name, price, and short description. Optionally add a checkout URL and an image. Toggle Active to publish or hide.',
          tips: [
            'Use short, memorable codes (PRD-101, ANK-002) — the AI matches these against customer messages.',
            'A checkout URL turns the AI into a sales agent — it can send the buy link directly.',
            'Inactive products stay in your catalog but are hidden from customers.',
          ],
        }}
      />
      <ProductsClient workspace={workspace} initialProducts={products} />
    </div>
  );
}
