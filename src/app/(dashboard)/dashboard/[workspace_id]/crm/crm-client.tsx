'use client';

import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import {
  Users, TrendingUp, Crown, AlertTriangle, Search, X, Loader2, Check,
  MessageCircle, Phone, SlidersHorizontal, Plus, Upload, Trash2, FileText, AlertCircle,
} from 'lucide-react';
import type { Workspace, WorkspaceCRM, WorkspaceCategory } from '@/lib/types/database';
import {
  updateCRMRecord, createCRMLead, deleteCRMRecord, bulkUpsertWhatsAppContacts,
} from './actions';

interface Metrics { totalLeads: number; highTicket: number; subscribed: number; expiringSoon: number; }
interface Props {
  workspace: Workspace;
  initialLeads: WorkspaceCRM[];
  metrics: Metrics;
  categories: WorkspaceCategory[];
}

interface ParsedContact { name: string; phone_number: string; category: string; }

export function CRMClient({ workspace, initialLeads, metrics, categories }: Props) {
  const [leads] = useState(initialLeads);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [editingLead, setEditingLead] = useState<WorkspaceCRM | null>(null);
  const [saving, setSaving] = useState(false);

  // Create modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createPlatform, setCreatePlatform] = useState<'whatsapp' | 'telegram'>('whatsapp');

  // Delete state
  const [deletingLead, setDeletingLead] = useState<WorkspaceCRM | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filtered = useMemo(() => {
    let result = leads;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        l.customer_name?.toLowerCase().includes(q) ||
        l.platform_user_id.toLowerCase().includes(q) ||
        l.phone_number?.toLowerCase().includes(q)
      );
    }
    if (tagFilter) {
      result = result.filter((l) => l.tags?.includes(tagFilter) || l.category === tagFilter);
    }
    return result;
  }, [leads, search, tagFilter]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => l.tags?.forEach((t) => set.add(t)));
    return Array.from(set);
  }, [leads]);

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLead) return;
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    const res = await updateCRMRecord(editingLead.id, workspace.id, fd);
    setSaving(false);
    if (res.error) { setBanner({ type: 'error', text: res.error }); return; }
    setEditingLead(null);
    window.location.reload();
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreating(true);
    const fd = new FormData(e.currentTarget);
    const res = await createCRMLead(workspace.id, fd);
    setCreating(false);
    if (res.error) { setBanner({ type: 'error', text: res.error }); return; }
    setShowAddModal(false);
    window.location.reload();
  };

  const handleDelete = async () => {
    if (!deletingLead) return;
    setDeleting(true);
    const res = await deleteCRMRecord(deletingLead.id, workspace.id);
    setDeleting(false);
    if (res.error) { setBanner({ type: 'error', text: res.error }); return; }
    setDeletingLead(null);
    window.location.reload();
  };

  // ---- CSV parsing (papaparse) ----
  const parseFile = (file: File) => {
    setParseError(null);
    setImportResult(null);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please upload a .csv file');
      return;
    }
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (results) => {
        const rows = results.data
          .map((row) => ({
            name: row['name'] ?? row['full name'] ?? '',
            phone_number: row['phone number'] ?? row['phone_number'] ?? row['phone'] ?? '',
            category: row['category'] ?? row['tag'] ?? '',
          }))
          .filter((r) => r.phone_number?.trim());

        if (rows.length === 0) {
          setParseError('No valid rows found. Ensure your CSV has columns: Name, Phone Number, Category.');
          setParsedContacts([]);
          return;
        }
        setParsedContacts(rows);
      },
      error: (err) => setParseError(err.message),
    });
  };

  const handleImport = async () => {
    if (parsedContacts.length === 0) return;
    setImporting(true);
    const res = await bulkUpsertWhatsAppContacts(workspace.id, parsedContacts);
    setImporting(false);
    if (res.error) {
      setImportResult(`Error: ${res.error}`);
      return;
    }
    setImportResult(`Successfully imported ${res.imported} WhatsApp contacts.`);
    setTimeout(() => window.location.reload(), 1200);
  };

  const resetImport = () => {
    setShowImportModal(false);
    setParsedContacts([]);
    setParseError(null);
    setImportResult(null);
    setDragActive(false);
  };

  const statCards = [
    { label: 'Total Leads', value: metrics.totalLeads, icon: Users, color: 'text-indigo-400', bg: 'from-indigo-500/10' },
    { label: 'High Ticket', value: metrics.highTicket, icon: Crown, color: 'text-amber-400', bg: 'from-amber-500/10' },
    { label: 'Subscribed', value: metrics.subscribed, icon: TrendingUp, color: 'text-emerald-400', bg: 'from-emerald-500/10' },
    { label: 'Expiring Soon', value: metrics.expiringSoon, icon: AlertTriangle, color: 'text-rose-400', bg: 'from-rose-500/10' },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            Customer CRM
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Leads & subscribers for <span className="text-indigo-500 dark:text-indigo-400 font-medium">{workspace.name}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition flex items-center gap-2"
          >
            <Upload className="w-3.5 h-3.5" /> Import WhatsApp Contacts
          </button>
          <button
            onClick={() => { setCreatePlatform('whatsapp'); setShowAddModal(true); }}
            className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-linear-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 shadow-lg shadow-indigo-500/25 transition flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> Add Lead
          </button>
        </div>
      </div>

      {banner && (
        <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${banner.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'}`}>
          <AlertCircle className="w-4 h-4" /> {banner.text}
        </div>
      )}

      {/* Bento Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
            className={`rounded-xl bg-linear-to-br ${card.bg} to-transparent backdrop-blur-md border border-border p-4
              hover:border-indigo-500/40 transition-all duration-300`}
          >
            <card.icon className={`w-5 h-5 ${card.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-50">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or ID..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted border border-input text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring outline-none transition"
          />
        </div>
        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-3 py-2 rounded-lg bg-muted border border-input text-xs text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition appearance-none"
        >
          <option value="">All Tags & Categories</option>
          {categories.length > 0 && (
            <optgroup label="Categories">
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </optgroup>
          )}
          {allTags.length > 0 && (
            <optgroup label="Tags">
              {allTags.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Data Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-12 text-center">
          <Users className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No CRM records found. Add a lead manually or import WhatsApp contacts.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-card backdrop-blur-md border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-wider text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-wider text-left font-medium">Platform</th>
                  <th className="px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-wider text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-wider text-left font-medium">Lead Score</th>
                  <th className="px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-wider text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-wider text-left font-medium">Expiry</th>
                  <th className="px-4 py-3 text-[10px] text-muted-foreground uppercase tracking-wider text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead) => (
                  <tr key={lead.id} className="border-b border-border/60 hover:bg-muted/50 transition">
                    <td className="px-4 py-3">
                      <p className="text-xs text-foreground font-medium">{lead.customer_name || 'Unknown'}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{lead.phone_number || lead.platform_user_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      {lead.channel_type === 'telegram' ? (
                        <span className="flex items-center gap-1 text-[10px] text-sky-400"><MessageCircle className="w-3 h-3" /> Telegram</span>
                      ) : lead.channel_type === 'web' ? (
                        <span className="flex items-center gap-1 text-[10px] text-indigo-400"><MessageCircle className="w-3 h-3" /> Web Chat</span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400"><Phone className="w-3 h-3" /> WhatsApp</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.category ? (
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">{lead.category}</span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className={`h-full rounded-full ${getScoreColor(lead.lead_score)} transition-all`}
                            style={{ width: `${Math.min(lead.lead_score, 100)}%` }} />
                        </div>
                        <span className="text-[10px] text-foreground font-mono">{lead.lead_score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-medium
                        ${lead.subscription_status === 'subscriber' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' :
                          lead.subscription_status === 'expired' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' :
                          'bg-muted text-muted-foreground border border-border'}`}>
                        {lead.subscription_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-muted-foreground">
                      {lead.subscription_expiry ? new Date(lead.subscription_expiry).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditingLead(lead)}
                          title="Quick Edit"
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-indigo-500 dark:hover:text-indigo-400 transition">
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeletingLead(lead)}
                          title="Delete"
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Add Lead Modal ---- */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 bg-card backdrop-blur-xl border border-border rounded-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Plus className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Add New Lead</h3>
                <button onClick={() => setShowAddModal(false)} className="p-1.5 rounded-lg hover:bg-muted transition"><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Name</label>
                  <input name="customer_name" placeholder="Customer name"
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Platform</label>
                  <select name="platform" value={createPlatform} onChange={(e) => setCreatePlatform(e.target.value as 'whatsapp' | 'telegram')}
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition appearance-none">
                    <option value="whatsapp">WhatsApp</option>
                    <option value="telegram">Telegram</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    {createPlatform === 'whatsapp' ? 'Phone Number' : 'Platform ID / Chat ID'}
                  </label>
                  <input name="platform_user_id" required placeholder={createPlatform === 'whatsapp' ? 'e.g. +2348012345678' : 'e.g. tg_123456'}
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                  {createPlatform === 'whatsapp' && <input type="hidden" name="phone_number" />}
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Category / Tag</label>
                  <select name="category"
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition appearance-none">
                    <option value="">— None —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                  {categories.length === 0 && <p className="text-[10px] text-muted-foreground mt-1">Define categories in workspace Settings.</p>}
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Lead Score (0–100)</label>
                  <input name="lead_score" type="number" min="0" max="100" defaultValue={10}
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition">Cancel</button>
                  <button type="submit" disabled={creating}
                    className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-linear-to-r from-indigo-500 to-purple-600 disabled:opacity-50 shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2">
                    {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Create Lead
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Edit Drawer Modal ---- */}
      <AnimatePresence>
        {editingLead && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setEditingLead(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 bg-card backdrop-blur-xl border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border sticky top-0 bg-card">
                <h3 className="text-sm font-semibold text-foreground">Quick Edit: {editingLead.customer_name || 'Unknown'}</h3>
                <button onClick={() => setEditingLead(null)} className="p-1.5 rounded-lg hover:bg-muted transition"><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <form onSubmit={handleUpdate} className="p-6 space-y-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Name</label>
                  <input name="customer_name" defaultValue={editingLead.customer_name ?? ''}
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Phone / ID</label>
                  <input name="phone_number" defaultValue={editingLead.phone_number ?? editingLead.platform_user_id}
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Category</label>
                  <select name="category" defaultValue={editingLead.category ?? ''}
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition appearance-none">
                    <option value="">— None —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                    {editingLead.category && !categories.some((c) => c.name === editingLead.category) && (
                      <option value={editingLead.category}>{editingLead.category}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Lead Score (0–100)</label>
                  <input name="lead_score" type="number" min="0" max="100" defaultValue={editingLead.lead_score}
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Tags (comma-separated)</label>
                  <input name="tags" defaultValue={editingLead.tags?.join(', ')}
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Subscription Status</label>
                  <select name="subscription_status" defaultValue={editingLead.subscription_status}
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition appearance-none">
                    <option value="lead">Lead</option>
                    <option value="non_subscriber">Non-Subscriber</option>
                    <option value="subscriber">Subscriber</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Subscription Expiry</label>
                  <input name="subscription_expiry" type="date" defaultValue={editingLead.subscription_expiry?.slice(0, 10) ?? ''}
                    className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition" />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setEditingLead(null)}
                    className="px-4 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-linear-to-r from-indigo-500 to-purple-600 disabled:opacity-50 shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Save
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Delete Confirmation Modal ---- */}
      <AnimatePresence>
        {deletingLead && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setDeletingLead(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm mx-4 bg-card backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
                  <Trash2 className="w-6 h-6 text-rose-500 dark:text-rose-400" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Delete Lead?</h3>
                <p className="text-xs text-muted-foreground mt-2">
                  This will permanently delete <span className="text-foreground font-medium">{deletingLead.customer_name || deletingLead.phone_number || deletingLead.platform_user_id}</span> from your CRM. This action cannot be undone.
                </p>
                <div className="flex gap-3 mt-6 w-full">
                  <button onClick={() => setDeletingLead(null)}
                    className="flex-1 px-4 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/70 transition">Cancel</button>
                  <button onClick={handleDelete} disabled={deleting}
                    className="flex-1 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Import WhatsApp CSV Modal ---- */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={resetImport}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg mx-4 bg-card backdrop-blur-xl border border-border rounded-2xl shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Phone className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Import WhatsApp Contacts
                </h3>
                <button onClick={resetImport} className="p-1.5 rounded-lg hover:bg-muted transition"><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>

              <div className="p-6 space-y-4">
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-300/90">
                    Imports are hardcoded to the <strong>WhatsApp</strong> platform. Your CSV must contain columns: <span className="font-mono text-emerald-600 dark:text-emerald-200">Name</span>, <span className="font-mono text-emerald-600 dark:text-emerald-200">Phone Number</span>, <span className="font-mono text-emerald-600 dark:text-emerald-200">Category</span>. Duplicates (matched by phone number) will be updated.
                  </p>
                </div>

                {/* Drag & Drop Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                  onDrop={(e) => {
                    e.preventDefault(); setDragActive(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) parseFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition
                    ${dragActive ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-border hover:border-border/80 bg-muted/40'}`}
                >
                  <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-foreground font-medium">Drag & drop your CSV here</p>
                  <p className="text-[10px] text-muted-foreground mt-1">or click to browse</p>
                </div>

                {parseError && (
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-[11px] text-rose-600 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" /> {parseError}
                  </div>
                )}

                {parsedContacts.length > 0 && (
                  <div className="rounded-lg bg-muted/40 border border-border overflow-hidden">
                    <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      <span className="text-[11px] text-foreground font-medium">{parsedContacts.length} contacts ready to import</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="px-3 py-1.5 text-[9px] text-muted-foreground uppercase text-left">Name</th>
                            <th className="px-3 py-1.5 text-[9px] text-muted-foreground uppercase text-left">Phone</th>
                            <th className="px-3 py-1.5 text-[9px] text-muted-foreground uppercase text-left">Category</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedContacts.slice(0, 50).map((c, i) => (
                            <tr key={i} className="border-b border-border">
                              <td className="px-3 py-1.5 text-[10px] text-foreground">{c.name || '—'}</td>
                              <td className="px-3 py-1.5 text-[10px] text-muted-foreground font-mono">{c.phone_number}</td>
                              <td className="px-3 py-1.5 text-[10px] text-purple-600 dark:text-purple-300">{c.category || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {importResult && (
                  <div className={`rounded-lg p-3 text-[11px] flex items-center gap-2 ${importResult.startsWith('Error') ? 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300' : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300'}`}>
                    {importResult.startsWith('Error') ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />} {importResult}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-1">
                  <button type="button" onClick={resetImport}
                    className="px-4 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition">Cancel</button>
                  <button onClick={handleImport} disabled={importing || parsedContacts.length === 0}
                    className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-linear-to-r from-emerald-500 to-teal-600 disabled:opacity-40 shadow-lg shadow-emerald-500/25 transition-all flex items-center gap-2">
                    {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Import {parsedContacts.length > 0 ? `(${parsedContacts.length})` : ''}
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
