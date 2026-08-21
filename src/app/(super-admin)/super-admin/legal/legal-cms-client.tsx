'use client';

import { useState, useTransition } from 'react';
import { Check, FileText, Loader2, Sparkles, Save, Trash2, X } from 'lucide-react';
import { generateLegalContent, saveLegalContent, deleteLegalContent } from './actions';

type ContentType = 'terms_of_service' | 'privacy_policy' | 'disclaimer' | 'cookie_policy';

interface LegalDoc {
  id: string;
  content_type: ContentType;
  title: string;
  content: string;
  version: string;
  is_active: boolean;
  last_generated_at: string | null;
  updated_at: string;
}

const CONTENT_TYPES: { value: ContentType; label: string; icon: string }[] = [
  { value: 'terms_of_service', label: 'Terms of Service', icon: '📜' },
  { value: 'privacy_policy', label: 'Privacy Policy', icon: '🔒' },
  { value: 'disclaimer', label: 'Legal Disclaimer', icon: '⚠️' },
  { value: 'cookie_policy', label: 'Cookie Policy', icon: '🍪' },
];

export default function LegalCmsClient({ initialContent }: { initialContent: LegalDoc[] }) {
  const [docs, setDocs] = useState(initialContent);
  const [selectedType, setSelectedType] = useState<ContentType>('terms_of_service');
  const [editingDoc, setEditingDoc] = useState<LegalDoc | null>(null);
  const [generatingAI, startGeneratingAI] = useTransition();
  const [saving, startSaving] = useTransition();
  const [notice, setNotice] = useState('');

  const currentDoc = docs.find(d => d.content_type === selectedType && d.is_active);

  const handleGenerateAI = () => {
    startGeneratingAI(async () => {
      const result = await generateLegalContent(selectedType);
      if (result.error) {
        setNotice(result.error);
      } else if (result.content) {
        // Create new doc with AI-generated content
        const newDoc: LegalDoc = {
          id: crypto.randomUUID(),
          content_type: selectedType,
          title: CONTENT_TYPES.find(t => t.value === selectedType)?.label ?? selectedType,
          content: result.content,
          version: '1.0',
          is_active: false,
          last_generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        setEditingDoc(newDoc);
        setNotice('AI content generated! Review and save to publish.');
      }
    });
  };

  const handleSave = () => {
    if (!editingDoc) return;
    
    const form = new FormData();
    form.set('content_type', editingDoc.content_type);
    form.set('title', editingDoc.title);
    form.set('content', editingDoc.content);
    form.set('version', editingDoc.version);
    form.set('is_active', String(editingDoc.is_active));
    if (editingDoc.id && !editingDoc.id.startsWith('temp_')) {
      form.set('id', editingDoc.id);
    }

    startSaving(async () => {
      const result = await saveLegalContent(form);
      if (result.error) {
        setNotice(result.error);
      } else {
        setNotice('Legal content saved successfully!');
        setEditingDoc(null);
        // Refresh page to get updated data
        window.location.reload();
      }
    });
  };

  const handleDelete = (docId: string) => {
    if (!confirm('Delete this legal document version?')) return;
    startSaving(async () => {
      const result = await deleteLegalContent(docId);
      if (result.error) {
        setNotice(result.error);
      } else {
        setDocs(docs.filter(d => d.id !== docId));
        setNotice('Document deleted.');
      }
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-indigo-500" />
            <h1 className="text-2xl font-bold text-white">Legal Content Management</h1>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            Manage platform-wide legal documents. Use AI to auto-generate templates based on platform features.
          </p>
        </div>
        <button
          onClick={handleGenerateAI}
          disabled={generatingAI || saving}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50"
        >
          {generatingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          AI Generate
        </button>
      </div>

      {notice && (
        <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-4 text-sm text-cyan-300">
          {notice}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Sidebar - Content Types */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Document Types</p>
          {CONTENT_TYPES.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm transition ${
                selectedType === type.value
                  ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                  : 'border-gray-800 bg-gray-900/50 text-gray-300 hover:bg-gray-900 hover:text-white'
              }`}
            >
              <span className="text-xl">{type.icon}</span>
              <span className="font-medium">{type.label}</span>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="space-y-4">
          {editingDoc ? (
            // Edit Mode
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {editingDoc.id.startsWith('temp_') ? 'New Document' : 'Edit Document'}
                </h2>
                <button
                  onClick={() => setEditingDoc(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs font-medium text-gray-400">Title</span>
                  <input
                    type="text"
                    value={editingDoc.title}
                    onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-gray-400">Version</span>
                  <input
                    type="text"
                    value={editingDoc.version}
                    onChange={(e) => setEditingDoc({ ...editingDoc, version: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-medium text-gray-400">Content (Markdown Supported)</span>
                  <textarea
                    value={editingDoc.content}
                    onChange={(e) => setEditingDoc({ ...editingDoc, content: e.target.value })}
                    rows={20}
                    className="mt-1 w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2 font-mono text-xs text-white focus:border-indigo-500 focus:outline-none resize-none"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input
                    type="checkbox"
                    checked={editingDoc.is_active}
                    onChange={(e) => setEditingDoc({ ...editingDoc, is_active: e.target.checked })}
                    className="h-4 w-4 accent-indigo-500"
                  />
                  Active (publicly visible)
                </label>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Document
              </button>
            </div>
          ) : (
            // View Mode
            <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
              {currentDoc ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">{currentDoc.title}</h2>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                        <span>Version {currentDoc.version}</span>
                        <span>•</span>
                        <span>Updated {new Date(currentDoc.updated_at).toLocaleDateString()}</span>
                        {currentDoc.last_generated_at && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-purple-400">
                              <Sparkles className="h-3 w-3" />
                              AI Generated
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingDoc(currentDoc)}
                        className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(currentDoc.id)}
                        className="rounded-lg bg-rose-900/30 px-3 py-1.5 text-xs font-medium text-rose-400 hover:bg-rose-900/50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="prose prose-invert prose-sm max-w-none rounded-lg border border-gray-800 bg-gray-950 p-6">
                    <div className="whitespace-pre-wrap font-mono text-xs text-gray-300">
                      {currentDoc.content}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-600" />
                  <p className="mt-4 text-sm text-gray-400">
                    No active document for this type.
                  </p>
                  <button
                    onClick={() => setEditingDoc({
                      id: `temp_${Date.now()}`,
                      content_type: selectedType,
                      title: CONTENT_TYPES.find(t => t.value === selectedType)?.label ?? selectedType,
                      content: '',
                      version: '1.0',
                      is_active: false,
                      last_generated_at: null,
                      updated_at: new Date().toISOString(),
                    })}
                    className="mt-4 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
                  >
                    Create New
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
