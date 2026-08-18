'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, Plus, Pencil, Trash2, X, Loader2, Check, AlertCircle } from 'lucide-react';
import type { WorkspaceCategory } from '@/lib/types/database';
import { createCategory, updateCategory, deleteCategory } from './category-actions';

interface Props {
  workspaceId: string;
  initialCategories: WorkspaceCategory[];
}

const PRESET_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];

export function CategoryManager({ workspaceId, initialCategories }: Props) {
  const [categories] = useState(initialCategories);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<WorkspaceCategory | null>(null);
  const [deleting, setDeleting] = useState<WorkspaceCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    fd.set('color', selectedColor);
    const res = await createCategory(workspaceId, fd);
    setBusy(false);
    if (res.error) { setBanner({ type: 'error', text: res.error }); return; }
    setShowAdd(false);
    window.location.reload();
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    fd.set('color', selectedColor);
    const res = await updateCategory(editing.id, workspaceId, fd);
    setBusy(false);
    if (res.error) { setBanner({ type: 'error', text: res.error }); return; }
    setEditing(null);
    window.location.reload();
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    const res = await deleteCategory(deleting.id, workspaceId);
    setBusy(false);
    if (res.error) { setBanner({ type: 'error', text: res.error }); return; }
    setDeleting(null);
    window.location.reload();
  };

  return (
    <div className="rounded-xl bg-zinc-900/60 backdrop-blur-md border border-white/10 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-purple-400" /> Categories & Tags
          </h2>
          <p className="text-[11px] text-gray-500 mt-1">
            Business-defined categories used for CRM leads and AI classification.
          </p>
        </div>
        <button
          onClick={() => { setSelectedColor(PRESET_COLORS[0]); setShowAdd(true); }}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 transition flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Add Category
        </button>
      </div>

      {banner && (
        <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${banner.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
          <AlertCircle className="w-4 h-4" /> {banner.text}
        </div>
      )}

      {categories.length === 0 ? (
        <div className="py-8 text-center">
          <Tag className="w-8 h-8 text-gray-700 mx-auto mb-2" />
          <p className="text-xs text-gray-500">No categories yet. Create one to organize your leads.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between rounded-lg bg-zinc-800/40 border border-white/5 px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-xs text-white font-medium">{cat.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setSelectedColor(cat.color); setEditing(cat); }}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-500 hover:text-indigo-400 transition">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleting(cat)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <AnimatePresence>
        {(showAdd || editing) && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => { setShowAdd(false); setEditing(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm mx-4 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white">{editing ? 'Edit Category' : 'New Category'}</h3>
                <button onClick={() => { setShowAdd(false); setEditing(null); }} className="p-1.5 rounded-lg hover:bg-white/5 transition"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
              <form onSubmit={editing ? handleUpdate : handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Name</label>
                  <input name="name" required defaultValue={editing?.name ?? ''} placeholder="e.g. VIP Client"
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-sm text-white focus:border-indigo-500/40 outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                      <button key={color} type="button" onClick={() => setSelectedColor(color)}
                        className={`w-7 h-7 rounded-full transition ${selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : ''}`}
                        style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
                {editing && (
                  <p className="text-[10px] text-amber-400/80">Renaming updates this category on all matching CRM contacts.</p>
                )}
                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={() => { setShowAdd(false); setEditing(null); }}
                    className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition">Cancel</button>
                  <button type="submit" disabled={busy}
                    className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-purple-500 to-indigo-600 disabled:opacity-50 transition flex items-center gap-2">
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleting && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleting(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm mx-4 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                  <Trash2 className="w-6 h-6 text-rose-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">Delete Category?</h3>
                <p className="text-xs text-gray-500 mt-2">
                  Delete <span className="text-white font-medium">{deleting.name}</span>? Existing contacts keep their tag value but it won&apos;t be a selectable category.
                </p>
                <div className="flex gap-3 mt-6 w-full">
                  <button onClick={() => setDeleting(null)}
                    className="flex-1 px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition">Cancel</button>
                  <button onClick={handleDelete} disabled={busy}
                    className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
