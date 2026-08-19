import { getConfigs } from './actions';
import ConfigsClient from './configs-client';

export default async function ConfigsPage() {
  const { configs, error } = await getConfigs();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">System Configuration</h2>
          <p className="text-xs text-gray-500 mt-1">
            Manage encrypted platform credentials. Secret values are AES-256-GCM encrypted at rest.
          </p>
        </div>
        <span className="text-[8px] text-amber-400 bg-amber-950/40 px-2 py-1 border border-amber-900/30 rounded font-bold uppercase">
          Encrypted Store
        </span>
      </div>

      <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-xs text-cyan-100">
        <p className="font-semibold text-cyan-300">Inngest runtime setup</p>
        <p className="mt-1 leading-5 text-cyan-100/70">Set <code>INNGEST_EVENT_KEY</code> here for webhooks, knowledge indexing, automations, articles, and web chat. Set <code>INNGEST_SIGNING_KEY</code> in the deployment environment and register <code>/api/inngest</code> in Inngest. The event key is now read dynamically from this encrypted config; the signing key protects the function endpoint and must remain an environment secret.</p>
      </div>

      {error ? (
        <div className="p-4 text-center text-rose-400 text-sm bg-rose-950/20 border border-rose-900/30 rounded-lg">
          Failed to load configs: {error}
        </div>
      ) : (
        <ConfigsClient configs={configs} />
      )}
    </div>
  );
}
