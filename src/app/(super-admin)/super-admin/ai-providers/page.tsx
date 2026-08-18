import { getProviders } from './actions';
import { AiProvidersClient } from './ai-providers-client';

export const dynamic = 'force-dynamic';

export default async function AiProvidersPage() {
  const { providers, error } = await getProviders();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Multi-LLM Provider Router</h1>
        <p className="text-xs text-gray-500 mt-1">
          Configure OpenAI-compatible AI providers. The router executes the primary provider first and
          gracefully fails over to fallbacks (ordered by priority) when a provider errors or times out.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded text-xs bg-rose-950/30 border border-rose-500/30 text-rose-300">
          Failed to load providers: {error}
        </div>
      )}

      <AiProvidersClient providers={providers as any} />
    </div>
  );
}
