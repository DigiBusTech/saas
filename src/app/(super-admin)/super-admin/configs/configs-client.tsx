'use client';

import { useState, useTransition } from 'react';
import { updateConfig } from './actions';

interface ConfigRow {
  id: string;
  config_key: string;
  display_value: string;
  description: string | null;
  is_secret: boolean;
}

export default function ConfigsClient({ configs }: { configs: ConfigRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function startEdit(config: ConfigRow) {
    setEditingId(config.id);
    setEditValue('');
    setFeedback(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValue('');
  }

  function handleSave(config: ConfigRow) {
    const formData = new FormData();
    formData.set('id', config.id);
    formData.set('config_value', editValue);
    formData.set('is_secret', String(config.is_secret));

    startTransition(async () => {
      const result = await updateConfig(formData);
      if (result.error) {
        setFeedback({ type: 'error', msg: result.error });
      } else {
        setFeedback({ type: 'success', msg: `${config.config_key} updated successfully` });
        setEditingId(null);
        setEditValue('');
      }
    });
  }

  return (
    <div className="space-y-4">
      {feedback && (
        <div className={`px-4 py-2 rounded text-xs font-medium border ${
          feedback.type === 'success'
            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30'
            : 'bg-rose-950/40 text-rose-400 border-rose-900/30'
        }`}>
          {feedback.msg}
        </div>
      )}

      <div className="bg-[#0F1219] border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800 bg-[#0B0E14]">
              <th className="text-left p-3 text-[9px] uppercase font-bold tracking-wider text-gray-500">Key</th>
              <th className="text-left p-3 text-[9px] uppercase font-bold tracking-wider text-gray-500">Description</th>
              <th className="text-left p-3 text-[9px] uppercase font-bold tracking-wider text-gray-500">Value</th>
              <th className="text-left p-3 text-[9px] uppercase font-bold tracking-wider text-gray-500">Type</th>
              <th className="text-right p-3 text-[9px] uppercase font-bold tracking-wider text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/40">
            {configs.map((config) => (
              <tr key={config.id} className="hover:bg-gray-900/40 transition">
                <td className="p-3 text-white font-mono font-medium">{config.config_key}</td>
                <td className="p-3 text-gray-400">{config.description ?? '—'}</td>
                <td className="p-3">
                  {editingId === config.id ? (
                    <input
                      type={config.is_secret ? 'password' : 'text'}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="Enter new value…"
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="font-mono text-gray-400">
                      {config.display_value || <span className="text-gray-600 italic">not set</span>}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                    config.is_secret
                      ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30'
                      : 'bg-gray-900 text-gray-400 border border-gray-800'
                  }`}>
                    {config.is_secret ? 'secret' : 'plain'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  {editingId === config.id ? (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSave(config)}
                        disabled={isPending || !editValue}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded disabled:opacity-40 transition"
                      >
                        {isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-2.5 py-1 text-gray-400 hover:text-white text-[10px] border border-gray-800 rounded transition"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(config)}
                      className="px-2.5 py-1 text-indigo-400 hover:text-indigo-300 text-[10px] font-bold border border-indigo-900/30 rounded transition"
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
