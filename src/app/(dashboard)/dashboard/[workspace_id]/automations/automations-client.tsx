'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Plus, X, Loader2, Pencil, Trash2, Power, PowerOff, ImageIcon, ExternalLink,
} from 'lucide-react';
import type { Workspace, WorkspaceAutomation } from '@/lib/types/database';
import { createAutomation, updateAutomation, toggleAutomation, deleteAutomation } from './actions';

const TRIGGER_TYPES = [
  { value: 'new_lead', label: 'New Lead Welcome' },
  { value: 'subscription_expiring', label: 'Subscription Expiring in X Days' },
  { value: 'post_purchase', label: 'Post-Purchase Follow-up' },
  { value: 'subscription_renewal', label: 'Subscription Renewal Reminder' },
  { value: 'product_flash_sale', label: 'Product Flash Sale' },
];

const VARIABLE_TAGS = ['{customer_name}', '{product_name}', '{expiry_date}'];

interface Props {
  workspace: Workspace;
  initialAutomations: WorkspaceAutomation[];
}

export function AutomationsClient({ workspace, initialAutomations }: Props) {
  const [automations, setAutomations] = useState(initialAutomations);
  const [showModal, setShowModal] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<WorkspaceAutomation | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const fd = new FormData(e.currentTarget);

    const result = editingAutomation
      ? await updateAutomation(editingAutomation.id, workspace.id, fd)
      : await createAutomation(workspace.id, fd);

    setSaving(false);
    if (result.error) { setError(result.error); return; }
    setShowModal(false);
    setEditingAutomation(null);
    window.location.reload();
  };

  const handleToggle = async (auto: WorkspaceAutomation) => {
    await toggleAutomation(auto.id, workspace.id, !auto.is_active);
    setAutomations((prev) => prev.map((a) => a.id === auto.id ? { ...a, is_active: !a.is_active } : a));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this automation?')) return;
    await deleteAutomation(id, workspace.id);
    setAutomations((prev) => prev.filter((a) => a.id !== id));
  };

  const getTriggerLabel = (t: string) => TRIGGER_TYPES.find((tr) => tr.value === t)?.label ?? t;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" /> Automations
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Drip sequences & reminders for <span className="text-indigo-400 font-medium">{workspace.name}</span>
          </p>
        </div>
        <button
          onClick={() => { setEditingAutomation(null); setError(''); setShowModal(true); }}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600
            hover:from-indigo-400 hover:to-purple-500 shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" /> New Automation
        </button>
      </div>

      {/* Automations Grid */}
      {automations.length === 0 ? (
        <div className="rounded-xl bg-zinc-900/60 backdrop-blur-md border border-white/10 p-12 text-center">
          <Zap className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No automations yet. Create your first drip sequence or reminder.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {automations.map((auto, i) => (
            <motion.div
              key={auto.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
              className={`rounded-xl bg-zinc-900/60 backdrop-blur-md border transition-all duration-300 p-5 space-y-3
                ${auto.is_active ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-white/10 opacity-60 hover:opacity-80'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    {auto.is_active && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                    {auto.title}
                  </h3>
                  <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded mt-1 inline-block">
                    {getTriggerLabel(auto.trigger_type)}
                  </span>
                  {auto.trigger_type === 'subscription_expiring' && auto.trigger_days_before > 0 && (
                    <span className="text-[10px] text-amber-400 ml-1">{auto.trigger_days_before} days before</span>
                  )}
                </div>
                <button onClick={() => handleToggle(auto)}
                  className={`p-1.5 rounded-lg transition ${auto.is_active ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-gray-600 hover:bg-white/5'}`}>
                  {auto.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-3">{auto.message_template}</p>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-gray-500">
                {auto.media_url && (
                  <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Media attached</span>
                )}
                {auto.cta_link && (
                  <span className="flex items-center gap-1"><ExternalLink className="w-3 h-3" /> {auto.cta_button_text || 'CTA'}</span>
                )}
              </div>

              <div className="flex gap-2 pt-1 border-t border-white/5">
                <button onClick={() => { setEditingAutomation(auto); setError(''); setShowModal(true); }}
                  className="flex-1 py-1.5 rounded-lg text-[10px] text-gray-400 hover:text-white hover:bg-white/5 transition flex items-center justify-center gap-1">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => handleDelete(auto.id)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] text-gray-400 hover:text-rose-400 hover:bg-rose-500/5 transition flex items-center justify-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg mx-4 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
                <h3 className="text-sm font-semibold text-white">
                  {editingAutomation ? 'Edit Automation' : 'New Automation'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 transition">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                {error && <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>}

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Title</label>
                  <input name="title" defaultValue={editingAutomation?.title} required
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-sm text-white focus:border-indigo-500/40 outline-none transition" />
                  <p className="text-[10px] text-gray-600 mt-1">A descriptive name for this automation (e.g. &quot;7-Day Renewal Reminder&quot;). Only visible to you.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Trigger Type</label>
                    <select name="trigger_type" defaultValue={editingAutomation?.trigger_type ?? 'new_lead'}
                      className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-sm text-white focus:border-indigo-500/40 outline-none transition appearance-none">
                      {TRIGGER_TYPES.map((t) => (
                        <option key={t.value} value={t.value} className="bg-zinc-900">{t.label}</option>
                      ))}
                    </select>
                    <p className="text-[10px] text-gray-600 mt-1">The event that fires this automation. The cron engine checks these daily.</p>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Days Before (if expiry)</label>
                    <input name="trigger_days_before" type="number" min="0" defaultValue={editingAutomation?.trigger_days_before ?? 3}
                      className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-sm text-white focus:border-indigo-500/40 outline-none transition" />
                    <p className="text-[10px] text-gray-600 mt-1">Only applies to &quot;Subscription Expiring&quot; trigger. Set 0 to fire on the expiry day itself.</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-gray-500">Message Template</label>
                    <div className="flex gap-1">
                      {VARIABLE_TAGS.map((tag) => (
                        <button key={tag} type="button"
                          onClick={() => {
                            const el = document.querySelector('textarea[name="message_template"]') as HTMLTextAreaElement;
                            if (el) { el.value += ` ${tag}`; el.focus(); }
                          }}
                          className="px-1.5 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition">
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea name="message_template" rows={4} defaultValue={editingAutomation?.message_template} required
                    placeholder="Hi {customer_name}, your subscription expires on {expiry_date}..."
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:border-indigo-500/40 outline-none transition resize-none" />
                  <p className="text-[10px] text-gray-600 mt-1">Write the message the AI sends. Use the variable tags above to personalize it. The AI may further refine the tone using your workspace&apos;s bot persona.</p>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Image/Flyer URL (optional)</label>
                  <input name="media_url" defaultValue={editingAutomation?.media_url ?? ''} placeholder="https://example.com/flyer.jpg"
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:border-indigo-500/40 outline-none transition" />
                  <p className="text-[10px] text-gray-600 mt-1">Attach a promotional image or flyer. This is sent as a rich-media card alongside the message on WhatsApp/Telegram.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">CTA Button Text</label>
                    <input name="cta_button_text" defaultValue={editingAutomation?.cta_button_text ?? ''}
                      placeholder="Renew Now"
                      className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:border-indigo-500/40 outline-none transition" />
                    <p className="text-[10px] text-gray-600 mt-1">The label on the clickable button sent to the customer (e.g. &quot;Renew Now&quot;, &quot;Shop Here&quot;).</p>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">CTA URL</label>
                    <input name="cta_link" defaultValue={editingAutomation?.cta_link ?? ''}
                      placeholder="https://..."
                      className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600 focus:border-indigo-500/40 outline-none transition" />
                    <p className="text-[10px] text-gray-600 mt-1">The URL the CTA button links to. Can be a payment link, landing page, or product page.</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 disabled:opacity-50 shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {editingAutomation ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
