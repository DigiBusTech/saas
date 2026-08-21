'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Plus, X, Loader2, Pencil, Trash2, Power, PowerOff, ImageIcon, ExternalLink, Mail, MessageSquare, Send, Calendar, Clock,
} from 'lucide-react';
import type { Workspace, WorkspaceAutomation } from '@/lib/types/database';
import { createAutomation, updateAutomation, toggleAutomation, deleteAutomation } from './actions';

const TRIGGER_TYPES = [
  { value: 'new_lead', label: 'New Lead Welcome' },
  { value: 'subscription_expiring', label: 'Subscription Expiring in X Days' },
  { value: 'post_purchase', label: 'Post-Purchase Follow-up' },
  { value: 'subscription_renewal', label: 'Subscription Renewal Reminder' },
  { value: 'product_flash_sale', label: 'Product Flash Sale' },
  { value: 'broadcast', label: 'Instant Broadcast' }, // PHASE 5.5
];

const VARIABLE_TAGS = ['{customer_name}', '{product_name}', '{expiry_date}', '{business_name}', '{lead_email}']; // PHASE 5.5: Added business_name, lead_email

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
  const [selectedChannels, setSelectedChannels] = useState<string[]>(['whatsapp', 'telegram']); // PHASE 5.5
  const [automationType, setAutomationType] = useState<'trigger' | 'instant' | 'scheduled' | 'drip'>('trigger'); // PHASE 5.5
  const [sendingNow, setSendingNow] = useState<string | null>(null);
  const [leadCount, setLeadCount] = useState<Record<string, number>>({});

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

  const getStatusBadge = (auto: WorkspaceAutomation) => {
    const badges = {
      draft: { label: 'Draft', class: 'text-gray-600 dark:text-gray-400 bg-gray-500/10' },
      active: { label: 'Active', class: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' },
      scheduled: { label: 'Scheduled', class: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' },
      processing: { label: 'Sending...', class: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 animate-pulse' },
      completed: { label: 'Completed', class: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10' },
      paused: { label: 'Paused', class: 'text-rose-600 dark:text-rose-400 bg-rose-500/10' },
    };
    const badge = badges[auto.status as keyof typeof badges] || badges.active;
    return <span className={`text-[9px] px-2 py-0.5 rounded font-medium ${badge.class}`}>{badge.label}</span>;
  };

  const handleSendNow = async (autoId: string) => {
    if (!confirm('Send this automation now to all eligible leads?')) return;
    setSendingNow(autoId);
    try {
      const res = await fetch(`/api/automations/${autoId}/dispatch`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Dispatched to ${data.leadCount} leads!`);
        window.location.reload();
      } else {
        alert(`❌ ${data.error || 'Failed to dispatch'}`);
      }
    } catch (err) {
      console.error(err);
      alert('❌ Network error');
    } finally {
      setSendingNow(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500 dark:text-amber-400" /> Automations
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Drip sequences & reminders for <span className="text-indigo-500 dark:text-indigo-400 font-medium">{workspace.name}</span>
          </p>
        </div>
        <button
          onClick={() => {
            setEditingAutomation(null);
            // PHASE 5.5: Reset to default values when creating new automation
            setSelectedChannels(['whatsapp', 'telegram']);
            setAutomationType('trigger');
            setError('');
            setShowModal(true);
          }}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-linear-to-r from-indigo-500 to-purple-600
            hover:from-indigo-400 hover:to-purple-500 shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" /> New Automation
        </button>
      </div>

      {/* Automations Grid */}
      {automations.length === 0 ? (
        <div className="rounded-xl bg-card backdrop-blur-md border border-border p-12 text-center">
          <Zap className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No automations yet. Create your first drip sequence or reminder.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {automations.map((auto, i) => (
            <motion.div
              key={auto.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
              className={`rounded-xl bg-card backdrop-blur-md border transition-all duration-300 p-5 space-y-3
                ${auto.is_active ? 'border-emerald-500/20 hover:border-emerald-500/40' : 'border-border opacity-60 hover:opacity-80'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      {auto.is_active && (
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                      )}
                      {auto.title}
                    </h3>
                    {getStatusBadge(auto)}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                      {getTriggerLabel(auto.trigger_type)}
                    </span>
                    {auto.trigger_type === 'subscription_expiring' && auto.trigger_days_before > 0 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400">{auto.trigger_days_before} days before</span>
                    )}
                    {auto.scheduled_at && (
                      <span className="text-[10px] text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(auto.scheduled_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {(auto.sent_count > 0 || auto.failed_count > 0) && (
                    <div className="text-[9px] text-muted-foreground mt-1">
                      Sent: {auto.sent_count} • Failed: {auto.failed_count}
                    </div>
                  )}
                </div>
                <button onClick={() => handleToggle(auto)}
                  className={`p-1.5 rounded-lg transition ${auto.is_active ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10' : 'text-muted-foreground hover:bg-muted'}`}>
                  {auto.is_active ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                </button>
              </div>

              <div className="bg-muted rounded-lg p-3">
                <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">{auto.message_template}</p>
              </div>

              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                {auto.media_url && (
                  <span className="flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Media attached</span>
                )}
                {auto.cta_link && (
                  <span className="flex items-center gap-1"><ExternalLink className="w-3 h-3" /> {auto.cta_button_text || 'CTA'}</span>
                )}
              </div>

              {/* PHASE 5.5: Channel badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {auto.channel_filter && Array.isArray(auto.channel_filter) && auto.channel_filter.map((channel) => {
                  const colors = {
                    whatsapp: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
                    telegram: 'text-sky-600 dark:text-sky-400 bg-sky-500/10',
                    email: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10',
                  };
                  const icons = {
                    whatsapp: <MessageSquare className="w-2.5 h-2.5" />,
                    telegram: <MessageSquare className="w-2.5 h-2.5" />,
                    email: <Mail className="w-2.5 h-2.5" />,
                  };
                  return (
                    <span key={channel} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-medium ${colors[channel as keyof typeof colors]}`}>
                      {icons[channel as keyof typeof icons]}
                      {channel}
                    </span>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-1 border-t border-border">
                {auto.automation_type === 'instant' && auto.status !== 'processing' && auto.status !== 'completed' && (
                  <button
                    onClick={() => handleSendNow(auto.id)}
                    disabled={sendingNow === auto.id}
                    className="flex-1 py-1.5 rounded-lg text-[10px] font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-1"
                  >
                    {sendingNow === auto.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Send Now
                  </button>
                )}
                <button onClick={() => {
                  setEditingAutomation(auto);
                  // PHASE 5.5: Pre-populate all fields from existing automation
                  setSelectedChannels(auto.channel_filter && Array.isArray(auto.channel_filter) ? auto.channel_filter : ['whatsapp', 'telegram']);
                  setAutomationType(auto.automation_type || 'trigger');
                  setError('');
                  setShowModal(true);
                }}
                  className="flex-1 py-1.5 rounded-lg text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted transition flex items-center justify-center gap-1">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => handleDelete(auto.id)}
                  className="flex-1 py-1.5 rounded-lg text-[10px] text-muted-foreground hover:text-rose-500 hover:bg-rose-500/5 transition flex items-center justify-center gap-1">
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
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg mx-4 bg-card backdrop-blur-xl border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-auto">
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">
                  {editingAutomation ? 'Edit Automation' : 'New Automation'}
                </h3>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                {error && <div className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 text-xs">{error}</div>}

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Title</label>
                  <input name="title" defaultValue={editingAutomation?.title} required
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                  <p className="text-[10px] text-muted-foreground mt-1">A descriptive name for this automation (e.g. &quot;7-Day Renewal Reminder&quot;). Only visible to you.</p>
                </div>

                {/* PHASE 5.5: Automation Type Selector */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Automation Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'trigger', label: 'Trigger', desc: 'Event-based', icon: <Zap className="w-3.5 h-3.5" /> },
                      { value: 'instant', label: 'Instant', desc: 'Send manually', icon: <Send className="w-3.5 h-3.5" /> },
                      { value: 'scheduled', label: 'Scheduled', desc: 'Future send', icon: <Calendar className="w-3.5 h-3.5" /> },
                      { value: 'drip', label: 'Drip', desc: 'Multi-step', icon: <Clock className="w-3.5 h-3.5" /> },
                    ].map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setAutomationType(type.value as any)}
                        className={`p-2 rounded-lg border text-xs font-medium transition ${
                          automationType === type.value
                            ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-600 dark:text-indigo-400'
                            : 'bg-muted border-input text-muted-foreground hover:border-ring'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          {type.icon}
                          <span className="text-[10px]">{type.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <input type="hidden" name="automation_type" value={automationType} />
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {automationType === 'trigger' && 'Fires automatically when event occurs (e.g., subscription expiring).'}
                    {automationType === 'instant' && 'Create now, send manually with "Send Now" button.'}
                    {automationType === 'scheduled' && 'Send automatically at a specific date/time.'}
                    {automationType === 'drip' && 'Multi-step sequence with delays between messages.'}
                  </p>
                </div>

                {/* Conditional: Date/Time Picker for Scheduled Blasts */}
                {automationType === 'scheduled' && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                      Scheduled Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      name="scheduled_at"
                      defaultValue={editingAutomation?.scheduled_at ? new Date(editingAutomation.scheduled_at).toISOString().slice(0, 16) : ''}
                      required={automationType === 'scheduled'}
                      className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Choose when this automation should send. The system checks every 5 minutes for ready automations.
                    </p>
                  </div>
                )}

                {/* Trigger Type & Days Before (only for trigger-based) */}
                {automationType === 'trigger' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Trigger Type</label>
                      <select name="trigger_type" defaultValue={editingAutomation?.trigger_type ?? 'new_lead'}
                        className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition appearance-none">
                        {TRIGGER_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <p className="text-[10px] text-muted-foreground mt-1">The event that fires this automation. The cron engine checks these daily.</p>
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Days Before (if expiry)</label>
                      <input name="trigger_days_before" type="number" min="0" defaultValue={editingAutomation?.trigger_days_before ?? 3}
                        className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                      <p className="text-[10px] text-muted-foreground mt-1">Only applies to &quot;Subscription Expiring&quot; trigger. Set 0 to fire on the expiry day itself.</p>
                    </div>
                  </div>
                )}
{/* PHASE 5.5: Multi-channel Selection */}
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                    Delivery Channels
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChannels((prev) =>
                          prev.includes('whatsapp') ? prev.filter((c) => c !== 'whatsapp') : [...prev, 'whatsapp']
                        );
                      }}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition flex items-center justify-center gap-2 ${
                        selectedChannels.includes('whatsapp')
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted border-input text-muted-foreground hover:border-ring'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChannels((prev) =>
                          prev.includes('telegram') ? prev.filter((c) => c !== 'telegram') : [...prev, 'telegram']
                        );
                      }}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition flex items-center justify-center gap-2 ${
                        selectedChannels.includes('telegram')
                          ? 'bg-sky-500/10 border-sky-500/50 text-sky-600 dark:text-sky-400'
                          : 'bg-muted border-input text-muted-foreground hover:border-ring'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Telegram
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChannels((prev) =>
                          prev.includes('email') ? prev.filter((c) => c !== 'email') : [...prev, 'email']
                        );
                      }}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition flex items-center justify-center gap-2 ${
                        selectedChannels.includes('email')
                          ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-600 dark:text-indigo-400'
                          : 'bg-muted border-input text-muted-foreground hover:border-ring'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      Email
                    </button>
                  </div>
                  <input type="hidden" name="channel_filter" value={JSON.stringify(selectedChannels)} />
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    Select which channels this automation sends to. Leads without contact info for selected channels will be skipped.
                  </p>
                </div>

                {/* PHASE 5.5: Email Subject (conditional) */}
                {selectedChannels.includes('email') && (
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                      Email Subject Line *
                    </label>
                    <input
                      name="email_subject"
                      defaultValue={editingAutomation?.email_subject ?? ''}
                      required={selectedChannels.includes('email')}
                      placeholder="Your subscription expires soon, {customer_name}"
                      className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring outline-none transition"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Subject line for email deliveries. Supports variables: {'{customer_name}'}, {'{business_name}'}.
                    </p>
                  </div>
                )}

                
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Message Template</label>
                    <div className="flex gap-1">
                      {VARIABLE_TAGS.map((tag) => (
                        <button key={tag} type="button"
                          onClick={() => {
                            const el = document.querySelector('textarea[name="message_template"]') as HTMLTextAreaElement;
                            if (el) { el.value += ` ${tag}`; el.focus(); }
                          }}
                          className="px-1.5 py-0.5 rounded text-[8px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition">
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea name="message_template" rows={4} defaultValue={editingAutomation?.message_template} required
                    placeholder="Hi {customer_name}, your subscription expires on {expiry_date}..."
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring outline-none transition resize-none" />
                  <p className="text-[10px] text-muted-foreground mt-1">Write the message the AI sends. Use the variable tags above to personalize it. The AI may further refine the tone using your workspace&apos;s bot persona.</p>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Image/Flyer URL (optional)</label>
                  <input name="media_url" defaultValue={editingAutomation?.media_url ?? ''} placeholder="https://example.com/flyer.jpg"
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                  <p className="text-[10px] text-muted-foreground mt-1">Attach a promotional image or flyer. This is sent as a rich-media card alongside the message on WhatsApp/Telegram.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">CTA Button Text</label>
                    <input name="cta_button_text" defaultValue={editingAutomation?.cta_button_text ?? ''}
                      placeholder="Renew Now"
                      className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                    <p className="text-[10px] text-muted-foreground mt-1">The label on the clickable button sent to the customer (e.g. &quot;Renew Now&quot;, &quot;Shop Here&quot;).</p>
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">CTA URL</label>
                    <input name="cta_link" defaultValue={editingAutomation?.cta_link ?? ''}
                      placeholder="https://..."
                      className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                    <p className="text-[10px] text-muted-foreground mt-1">The URL the CTA button links to. Can be a payment link, landing page, or product page.</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-linear-to-r from-indigo-500 to-purple-600 disabled:opacity-50 shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2">
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
