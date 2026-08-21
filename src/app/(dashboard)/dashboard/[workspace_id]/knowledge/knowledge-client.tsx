'use client';

import { useState, useTransition } from 'react';
import { addKnowledgeDocument, deleteKnowledgeDocument, updateKnowledgeDocument } from './actions';

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  created_at: string;
  has_embedding: boolean;
  status?: string | null;
}

interface Props {
  documents: KnowledgeDoc[];
  workspaceId: string;
}

function StatusBadge({ doc }: { doc: KnowledgeDoc }) {
  // Prefer explicit status; fall back to embedding presence.
  const status = (doc.status || (doc.has_embedding ? 'INDEXED' : 'PENDING')).toUpperCase();

  const map: Record<string, { label: string; cls: string }> = {
    INDEXED: {
      label: 'Indexed',
      cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    },
    PENDING: {
      label: 'Pending',
      cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 animate-pulse',
    },
    FAILED: {
      label: 'Failed',
      cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    },
  };

  const info = map[status] ?? map.PENDING;

  return (
    <span className={`text-[7px] px-1 py-0.5 border rounded font-bold uppercase shrink-0 ${info.cls}`}>
      {info.label}
    </span>
  );
}

export function KnowledgeClient({ documents, workspaceId }: Props) {
  const [showAdd, setShowAdd] = useState(false);
  const [editDoc, setEditDoc] = useState<KnowledgeDoc | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleAdd(formData: FormData) {
    setMessage(null);
    formData.set('workspace_id', workspaceId);
    const result = await addKnowledgeDocument(formData);
    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({
        type: 'success',
        text: `Document added! (${result?.chunksCreated ?? 1} chunk${(result?.chunksCreated ?? 1) > 1 ? 's' : ''} created) — indexing in background.`,
      });
      setShowAdd(false);
    }
  }

  async function handleEdit(formData: FormData) {
    setMessage(null);
    if (!editDoc) return;
    formData.set('id', editDoc.id);
    formData.set('workspace_id', workspaceId);
    const result = await updateKnowledgeDocument(formData);
    if (result?.error) {
      setMessage({ type: 'error', text: result.error });
    } else {
      setMessage({ type: 'success', text: 'Document updated — re-indexing in background.' });
      setEditDoc(null);
    }
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteKnowledgeDocument(id, workspaceId);
      if (result?.error) setMessage({ type: 'error', text: result.error });
    });
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Knowledge Grounding</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Add documents the AI uses to answer questions for this business. Text is chunked and vectorized for semantic search.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="text-xs px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded transition"
        >
          + Add Document
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded text-xs ${message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300'}`}>
          {message.text}
        </div>
      )}

      {/* Add Document Form */}
      {showAdd && (
        <form action={handleAdd} className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground">Add Knowledge Document</h3>
          <p className="text-[10px] text-muted-foreground">
            Paste raw text content. Long documents will be automatically split into optimal chunks for retrieval.
          </p>
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">Document Title</label>
            <input name="title" type="text" placeholder="e.g. Payment Methods FAQ" required
              className="w-full bg-muted border border-input rounded px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-ring outline-none" />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">Content</label>
            <textarea name="content" rows={10} required minLength={10} placeholder="Paste your knowledge base text here. This can be FAQ answers, pricing tables, service descriptions, policies, etc."
              className="w-full bg-muted border border-input rounded px-3 py-2 text-xs text-foreground/80 font-mono focus:ring-1 focus:ring-ring outline-none leading-relaxed resize-y" />
          </div>
          <div className="bg-muted border border-border rounded p-3">
            <p className="text-[9px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground/80">How it works:</strong> Your text is split into ~1000 character chunks with overlap.
              Each chunk gets a vector embedding generated via AI. When a customer asks a question, the system searches
              these vectors for the most relevant chunks and feeds them to the AI for grounded, accurate answers.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="text-xs px-3 py-1.5 bg-muted rounded text-muted-foreground hover:text-foreground transition">
              Cancel
            </button>
            <button type="submit" className="text-xs px-4 py-1.5 bg-primary hover:bg-primary/90 rounded text-primary-foreground font-bold transition">
              Save & Generate Embeddings
            </button>
          </div>
        </form>
      )}

      {/* Edit Document Modal */}
      {editDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setEditDoc(null)}>
          <form
            action={handleEdit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-card border border-border rounded-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">Edit Knowledge Document</h3>
              <button type="button" onClick={() => setEditDoc(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
            </div>
            <p className="text-[10px] text-amber-600 dark:text-amber-400/80">
              Saving will reset the document to <strong>PENDING</strong> and re-trigger vectorization.
            </p>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">Document Title</label>
              <input name="title" type="text" defaultValue={editDoc.title} required
                className="w-full bg-muted border border-input rounded px-3 py-2 text-xs text-foreground focus:ring-1 focus:ring-ring outline-none" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">Content</label>
              <textarea name="content" rows={12} required minLength={10} defaultValue={editDoc.content}
                className="w-full bg-muted border border-input rounded px-3 py-2 text-xs text-foreground/80 font-mono focus:ring-1 focus:ring-ring outline-none leading-relaxed resize-y" />
            </div>
            <div className="flex gap-2 pt-2 justify-end">
              <button type="button" onClick={() => setEditDoc(null)} className="text-xs px-3 py-1.5 bg-muted rounded text-muted-foreground hover:text-foreground transition">
                Cancel
              </button>
              <button type="submit" className="text-xs px-4 py-1.5 bg-primary hover:bg-primary/90 rounded text-primary-foreground font-bold transition">
                Save & Re-Index
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Document List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
            Stored Documents ({documents.length})
          </h3>
        </div>

        {documents.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <svg className="w-10 h-10 text-indigo-500/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5A2.5 2.5 0 006.5 22H20V2H6.5A2.5 2.5 0 004 4.5v15z" />
            </svg>
            <p className="text-xs text-muted-foreground">No knowledge documents yet. Add your first document to enable AI grounding for this business.</p>
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="bg-card border border-border rounded-lg p-4 hover:border-border/70 transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-xs font-semibold text-foreground truncate">{doc.title}</h4>
                    <StatusBadge doc={doc} />
                  </div>
                  <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed font-mono">
                    {doc.content.slice(0, 200)}...
                  </p>
                  <p className="text-[9px] text-muted-foreground mt-2">
                    Added {new Date(doc.created_at).toLocaleDateString()} • {doc.content.length.toLocaleString()} chars
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setEditDoc(doc)}
                    disabled={isPending}
                    className="text-[10px] px-2 py-1 border border-border rounded text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition disabled:opacity-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id, doc.title)}
                    disabled={isPending}
                    className="text-[10px] px-2 py-1 border border-border rounded text-rose-500 hover:text-rose-400 transition disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
