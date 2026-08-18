'use client';

import { useState, useTransition } from 'react';
import { addKnowledgeDocument, deleteKnowledgeDocument } from './actions';

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  created_at: string;
  has_embedding: boolean;
}

interface Props {
  documents: KnowledgeDoc[];
}

export function KnowledgeClient({ documents }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleAdd(formData: FormData) {
    setMessage(null);
    const result = await addKnowledgeDocument(formData);
    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: `Document added successfully! (${result?.chunksCreated ?? 1} chunk${(result?.chunksCreated ?? 1) > 1 ? 's' : ''} created)` });
      setShowAdd(false);
    }
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteKnowledgeDocument(id);
      if (result?.error) setMessage({ type: 'error', text: result.error });
    });
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">Knowledge Grounding</h2>
          <p className="text-xs text-gray-500 mt-1">
            Add documents the AI uses to answer questions. Text is chunked and vectorized for semantic search.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded transition"
        >
          + Add Document
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded text-xs ${message.type === 'success' ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-300' : 'bg-rose-950/30 border border-rose-500/30 text-rose-300'}`}>
          {message.text}
        </div>
      )}

      {/* Add Document Form */}
      {showAdd && (
        <form action={handleAdd} className="bg-[#0F1219] border border-gray-800 rounded-lg p-6 space-y-4">
          <h3 className="text-sm font-bold text-white">Add Knowledge Document</h3>
          <p className="text-[10px] text-gray-500">
            Paste raw text content. Long documents will be automatically split into optimal chunks for retrieval.
          </p>
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">Document Title</label>
            <input name="title" type="text" placeholder="e.g. Payment Methods FAQ" required
              className="w-full bg-[#0B0E14] border border-gray-800 rounded px-3 py-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1.5">Content</label>
            <textarea name="content" rows={10} required minLength={10} placeholder="Paste your knowledge base text here. This can be FAQ answers, pricing tables, service descriptions, policies, etc."
              className="w-full bg-[#0B0E14] border border-gray-800 rounded px-3 py-2 text-xs text-gray-300 font-mono focus:ring-1 focus:ring-indigo-500 outline-none leading-relaxed resize-y" />
          </div>
          <div className="bg-[#0B0E14] border border-gray-800 rounded p-3">
            <p className="text-[9px] text-gray-500 leading-relaxed">
              <strong className="text-gray-400">How it works:</strong> Your text is split into ~1000 character chunks with overlap.
              Each chunk gets a vector embedding generated via AI. When a customer asks a question, the system searches
              these vectors for the most relevant chunks and feeds them to the AI for grounded, accurate answers.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="text-xs px-3 py-1.5 bg-gray-800 rounded text-gray-400 hover:text-white transition">
              Cancel
            </button>
            <button type="submit" className="text-xs px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-white font-bold transition">
              Save & Generate Embeddings
            </button>
          </div>
        </form>
      )}

      {/* Document List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] uppercase font-bold tracking-wider text-gray-500">
            Stored Documents ({documents.length})
          </h3>
        </div>

        {documents.length === 0 ? (
          <div className="bg-[#0F1219] border border-gray-800 rounded-lg p-12 text-center">
            <svg className="w-10 h-10 text-indigo-500/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z" />
            </svg>
            <p className="text-xs text-gray-500">No knowledge documents yet. Add your first document to enable AI grounding.</p>
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="bg-[#0F1219] border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-xs font-semibold text-white truncate">{doc.title}</h4>
                    {doc.has_embedding ? (
                      <span className="text-[7px] px-1 py-0.5 bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded font-bold uppercase shrink-0">
                        Vectorized
                      </span>
                    ) : (
                      <span className="text-[7px] px-1 py-0.5 bg-amber-950/40 text-amber-400 border border-amber-900/30 rounded font-bold uppercase shrink-0">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-500 line-clamp-2 leading-relaxed font-mono">
                    {doc.content.slice(0, 200)}...
                  </p>
                  <p className="text-[9px] text-gray-600 mt-2">
                    Added {new Date(doc.created_at).toLocaleDateString()} • {doc.content.length.toLocaleString()} chars
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(doc.id, doc.title)}
                  disabled={isPending}
                  className="text-[10px] px-2 py-1 border border-gray-800 rounded text-rose-400 hover:text-rose-300 transition shrink-0 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
