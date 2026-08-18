'use client';

import { useState, useTransition } from 'react';
import { updateEmailTemplate, createEmailTemplate, deleteEmailTemplate } from './actions';

interface Template {
  id: string;
  template_slug: string;
  subject: string;
  html_body: string;
  variables: string[];
  created_at: string;
  updated_at: string;
}

export default function EmailsClient({ templates }: { templates: Template[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Edit form state
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editVars, setEditVars] = useState('');

  // Create form state
  const [newSlug, setNewSlug] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newVars, setNewVars] = useState('[]');

  function startEdit(tpl: Template) {
    setEditingId(tpl.id);
    setEditSubject(tpl.subject);
    setEditBody(tpl.html_body);
    setEditVars(JSON.stringify(tpl.variables));
    setFeedback(null);
    setShowCreate(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditSubject('');
    setEditBody('');
    setEditVars('');
  }

  function handleUpdate(id: string) {
    const formData = new FormData();
    formData.set('id', id);
    formData.set('subject', editSubject);
    formData.set('html_body', editBody);
    formData.set('variables', editVars);

    startTransition(async () => {
      const result = await updateEmailTemplate(formData);
      if (result.error) {
        setFeedback({ type: 'error', msg: result.error });
      } else {
        setFeedback({ type: 'success', msg: 'Template updated successfully' });
        cancelEdit();
      }
    });
  }

  function handleCreate() {
    const formData = new FormData();
    formData.set('template_slug', newSlug);
    formData.set('subject', newSubject);
    formData.set('html_body', newBody);
    formData.set('variables', newVars);

    startTransition(async () => {
      const result = await createEmailTemplate(formData);
      if (result.error) {
        setFeedback({ type: 'error', msg: result.error });
      } else {
        setFeedback({ type: 'success', msg: 'Template created successfully' });
        setShowCreate(false);
        setNewSlug('');
        setNewSubject('');
        setNewBody('');
        setNewVars('[]');
      }
    });
  }

  function handleDelete(id: string, slug: string) {
    if (!confirm(`Delete template "${slug}"? This cannot be undone.`)) return;
    const formData = new FormData();
    formData.set('id', id);

    startTransition(async () => {
      const result = await deleteEmailTemplate(formData);
      if (result.error) {
        setFeedback({ type: 'error', msg: result.error });
      } else {
        setFeedback({ type: 'success', msg: `Template "${slug}" deleted` });
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

      {/* Template List */}
      <div className="space-y-3">
        {templates.map((tpl) => (
          <div key={tpl.id} className="bg-[#0F1219] border border-gray-800 rounded-lg overflow-hidden">
            {/* Header Row */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-indigo-950/40 text-indigo-400 border border-indigo-900/30 rounded text-[9px] font-bold font-mono">
                  {tpl.template_slug}
                </span>
                <span className="text-xs text-gray-400">{tpl.subject}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewId(previewId === tpl.id ? null : tpl.id)}
                  className="px-2.5 py-1 text-gray-400 hover:text-white text-[10px] border border-gray-800 rounded transition"
                >
                  {previewId === tpl.id ? 'Hide Preview' : 'Preview'}
                </button>
                <button
                  onClick={() => startEdit(tpl)}
                  className="px-2.5 py-1 text-indigo-400 hover:text-indigo-300 text-[10px] font-bold border border-indigo-900/30 rounded transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(tpl.id, tpl.template_slug)}
                  className="px-2.5 py-1 text-rose-400 hover:text-rose-300 text-[10px] border border-rose-900/30 rounded transition"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Variables */}
            <div className="px-4 py-2 flex items-center gap-1.5 flex-wrap">
              <span className="text-[9px] text-gray-500 uppercase font-bold">Variables:</span>
              {(tpl.variables ?? []).map((v: string) => (
                <span key={v} className="px-1.5 py-0.5 bg-gray-900 text-gray-300 border border-gray-800 rounded text-[9px] font-mono">
                  {`{{${v}}}`}
                </span>
              ))}
              {(!tpl.variables || tpl.variables.length === 0) && (
                <span className="text-[9px] text-gray-600 italic">none</span>
              )}
            </div>

            {/* Preview */}
            {previewId === tpl.id && (
              <div className="border-t border-gray-800">
                <div className="p-4">
                  <p className="text-[9px] text-gray-500 uppercase font-bold mb-2">HTML Preview</p>
                  <div
                    className="bg-white rounded-lg overflow-hidden"
                    dangerouslySetInnerHTML={{ __html: tpl.html_body }}
                  />
                </div>
              </div>
            )}

            {/* Edit Form */}
            {editingId === tpl.id && (
              <div className="border-t border-gray-800 p-4 space-y-3 bg-gray-900/30">
                <div>
                  <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Subject</label>
                  <input
                    type="text"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">HTML Body</label>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={12}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Variables (JSON array)</label>
                  <input
                    type="text"
                    value={editVars}
                    onChange={(e) => setEditVars(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
                    placeholder='["var1", "var2"]'
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdate(tpl.id)}
                    disabled={isPending}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded disabled:opacity-40 transition"
                  >
                    {isPending ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-4 py-2 text-gray-400 hover:text-white text-xs border border-gray-800 rounded transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create New Template */}
      {showCreate ? (
        <div className="bg-[#0F1219] border border-indigo-900/30 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-bold text-white">Create New Template</h3>
          <div>
            <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Template Slug</label>
            <input
              type="text"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="e.g. invoice_sent"
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Subject</label>
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">HTML Body</label>
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              rows={10}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[9px] text-gray-500 uppercase font-bold mb-1">Variables (JSON array)</label>
            <input
              type="text"
              value={newVars}
              onChange={(e) => setNewVars(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-xs font-mono focus:border-indigo-500 focus:outline-none"
              placeholder='["var1", "var2"]'
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              disabled={isPending || !newSlug || !newSubject || !newBody}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded disabled:opacity-40 transition"
            >
              {isPending ? 'Creating…' : 'Create Template'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-gray-400 hover:text-white text-xs border border-gray-800 rounded transition"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setShowCreate(true); setEditingId(null); setFeedback(null); }}
          className="w-full py-3 border border-dashed border-gray-700 hover:border-indigo-500 rounded-lg text-xs text-gray-400 hover:text-indigo-400 transition"
        >
          + Create New Email Template
        </button>
      )}
    </div>
  );
}
