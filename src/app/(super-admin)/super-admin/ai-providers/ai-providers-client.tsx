'use client';

import { useState, useTransition } from 'react';
import { upsertProvider, deleteProvider, testProvider } from './actions';

interface Provider {
  id: string;
  provider_name: string;
  base_url: string;
  model_name: string;
  display_key: string;
  priority: number;
  is_primary: boolean;
  is_fallback: boolean;
  is_active: boolean;
}

interface Props {
  providers: Provider[];
}

const EMPTY: Partial<Provider> = {
  provider_name: '',
  base_url: 'https://api.openai.com/v1',
  model_name: '',
  priority: 1,
  is_primary: false,
  is_fallback: true,
  is_active: true,
};

export function AiProvidersClient({ providers }: Props) {
  const [editing, setEditing] = useState<Partial<Provider> | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function openNew() {
    setEditing({ ...EMPTY });
    setApiKey('');
    setMessage(null);
  }

  function openEdit(p: Provider) {
    setEditing({ ...p });
    setApiKey('');
    setMessage(null);
  }

  async function handleSave(formData: FormData) {
    setMessage(null);
    formData.set('api_key', apiKey);
    const result = await upsertProvider(formData);
    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'Provider saved.' });
      setEditing(null);
      setApiKey('');
    }
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete provider "${name}"?`)) return;
    startTransition(async () => {
      const result = await deleteProvider(id);
      if (result?.error) setMessage({ type: 'error', text: result.error });
    });
  }

  async function handleTest(p: Provider) {
    setTesting(p.id);
    setTestResults((prev) => ({ ...prev, [p.id]: { ok: false, text: 'Testingâ€¦' } }));
    const res = await testProvider({ id: p.id, base_url: p.base_url, model_name: p.model_name });
    setTestResults((prev) => ({
      ...prev,
      [p.id]: { ok: !!res.ok, text: res.message || (res.ok ? 'OK' : 'Failed') },
    }));
    setTesting(null);
  }

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-3 rounded text-xs ${message.type === 'success' ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-300' : 'bg-rose-950/30 border border-rose-500/30 text-rose-300'}`}>
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={openNew} className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded transition">
          + Add Provider
        </button>
      </div>

      {/* Editor Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setEditing(null)}>
          <form
            action={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-[#0F1219] border border-gray-800 rounded-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">{editing.id ? 'Edit' : 'Add'} AI Provider</h3>
              <button type="button" onClick={() => setEditing(null)} className="text-gray-500 hover:text-white text-lg leading-none">Ã—</button>
            </div>

            {editing.id && <input type="hidden" name="id" value={editing.id} />}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">Provider Name</label>
                <input name="provider_name" defaultValue={editing.provider_name} placeholder="Groq" required
                  className="w-full bg-[#0B0E14] border border-gray-800 rounded px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">Priority</label>
                <input name="priority" type="number" defaultValue={editing.priority ?? 1} min={1}
                  className="w-full bg-[#0B0E14] border border-gray-800 rounded px-3 py-2 text-xs text-white outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">Base URL</label>
              <input name="base_url" defaultValue={editing.base_url} placeholder="https://api.groq.com/openai/v1"
                className="w-full bg-[#0B0E14] border border-gray-800 rounded px-3 py-2 text-xs text-white font-mono outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">Model Name</label>
              <input name="model_name" defaultValue={editing.model_name} placeholder="llama-3.1-8b-instant or openai/gpt-oss-20b" required
                className="w-full bg-[#0B0E14] border border-gray-800 rounded px-3 py-2 text-xs text-white font-mono outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">
                API Key {editing.id && <span className="text-gray-600 normal-case font-normal">(leave blank to keep existing)</span>}
              </label>
              <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} type="password" placeholder={editing.id ? editing.display_key : 'sk-â€¦'}
                className="w-full bg-[#0B0E14] border border-gray-800 rounded px-3 py-2 text-xs text-white font-mono outline-none focus:ring-1 focus:ring-indigo-500" />
            </div>

            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input type="checkbox" name="is_primary" defaultChecked={editing.is_primary} /> Primary
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input type="checkbox" name="is_fallback" defaultChecked={editing.is_fallback ?? true} /> Fallback
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300">
                <input type="checkbox" name="is_active" defaultChecked={editing.is_active ?? true} /> Active
              </label>
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button type="button" onClick={() => setEditing(null)} className="text-xs px-3 py-1.5 bg-gray-800 rounded text-gray-400 hover:text-white transition">Cancel</button>
              <button type="submit" className="text-xs px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-white font-bold transition">Save Provider</button>
            </div>
          </form>
        </div>
      )}

      {/* Providers Table */}
      <div className="bg-[#0F1219] border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800 text-[10px] uppercase tracking-wider text-gray-500">
              <th className="text-left px-4 py-3">Provider</th>
              <th className="text-left px-4 py-3">Model</th>
              <th className="text-left px-4 py-3">Base URL</th>
              <th className="text-left px-4 py-3">Key</th>
              <th className="text-center px-4 py-3">Priority</th>
              <th className="text-center px-4 py-3">Flags</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No providers configured. Add one to enable the LLM router.
                </td>
              </tr>
            ) : (
              providers.map((p) => (
                <tr key={p.id} className="border-b border-gray-800/50 hover:bg-white/2">
                  <td className="px-4 py-3 font-semibold text-white">{p.provider_name}</td>
                  <td className="px-4 py-3 text-gray-400 font-mono">{p.model_name}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono truncate max-w-45">{p.base_url}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono">{p.display_key}</td>
                  <td className="px-4 py-3 text-center text-gray-400">{p.priority}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {p.is_primary && <span className="text-[8px] px-1 py-0.5 rounded bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 uppercase font-bold">Primary</span>}
                      {p.is_fallback && <span className="text-[8px] px-1 py-0.5 rounded bg-sky-950/40 text-sky-400 border border-sky-900/30 uppercase font-bold">Fallback</span>}
                      <span className={`text-[8px] px-1 py-0.5 rounded uppercase font-bold border ${p.is_active ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' : 'bg-gray-800 text-gray-500 border-gray-700'}`}>
                        {p.is_active ? 'Active' : 'Off'}
                      </span>
                    </div>
                    {testResults[p.id] && (
                      <p className={`mt-1 text-[9px] text-center ${testResults[p.id].ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {testResults[p.id].text.slice(0, 60)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => handleTest(p)} disabled={testing === p.id}
                        className="text-[10px] px-2 py-1 border border-gray-800 rounded text-sky-400 hover:text-sky-300 transition disabled:opacity-50">
                        {testing === p.id ? 'Testingâ€¦' : 'Test'}
                      </button>
                      <button onClick={() => openEdit(p)}
                        className="text-[10px] px-2 py-1 border border-gray-800 rounded text-indigo-400 hover:text-indigo-300 transition">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p.id, p.provider_name)} disabled={isPending}
                        className="text-[10px] px-2 py-1 border border-gray-800 rounded text-rose-400 hover:text-rose-300 transition disabled:opacity-50">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
