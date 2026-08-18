import { getPages, getDocs } from './actions';
import CmsClient from './cms-client';

export default async function CmsPage() {
  const [{ pages, error: pagesError }, { docs, error: docsError }] = await Promise.all([
    getPages(),
    getDocs(),
  ]);

  const error = pagesError || docsError;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">CMS — Pages & Documentation</h2>
          <p className="text-xs text-gray-500 mt-1">
            Create and manage public pages with dynamic content blocks, and documentation articles.
          </p>
        </div>
      </div>

      {error ? (
        <div className="p-4 text-center text-rose-400 text-sm bg-rose-950/20 border border-rose-900/30 rounded-lg">
          Failed to load CMS data: {error}
        </div>
      ) : (
        <CmsClient pages={pages} docs={docs} />
      )}
    </div>
  );
}
