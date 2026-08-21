'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Settings, Bot, User, Headphones, Loader2, Check, Sparkles, AlertTriangle, Trash2 } from 'lucide-react';
import type { Workspace, AgentMode } from '@/lib/types/database';
import { updateWorkspace, deleteWorkspace } from '../../workspaces/actions';

const BOT_PERSONAS = [
  { value: 'Professional English', label: 'Professional English', desc: 'Formal, polished business tone' },
  { value: 'Casual English', label: 'Casual English', desc: 'Friendly, conversational style' },
  { value: 'Nigerian Pidgin', label: 'Nigerian Pidgin', desc: 'Warm pidgin-English blend' },
  { value: 'Yoruba-Infused English', label: 'Yoruba-Infused English', desc: 'English with Yoruba expressions' },
  { value: 'Hausa-Infused English', label: 'Hausa-Infused English', desc: 'English with Hausa expressions' },
  { value: 'Custom Prompt', label: 'Custom Prompt', desc: 'Define your own persona instructions' },
];

const AGENT_MODES: { value: AgentMode; label: string; desc: string; icon: typeof Bot }[] = [
  { value: 'autopilot', label: 'Autopilot', desc: 'AI handles all queries and sends responses automatically.', icon: Bot },
  { value: 'copilot', label: 'Copilot (Human-in-Loop)', desc: 'AI drafts responses & CRM updates, waits for human approval.', icon: User },
  { value: 'manual', label: 'Manual', desc: 'AI paused â€” human handles all operator chat directly.', icon: Headphones },
];

interface Props {
  workspace: Workspace;
}

export function SettingsClient({ workspace }: Props) {
  const router = useRouter();
  const [persona, setPersona] = useState(workspace.bot_persona);
  const [agentMode, setAgentMode] = useState<AgentMode>(workspace.agent_mode);
  const [name, setName] = useState(workspace.name);
  const [customPrompt, setCustomPrompt] = useState((workspace as any).custom_prompt ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    const fd = new FormData();
    fd.set('name', name);
    fd.set('bot_persona', persona);
    fd.set('agent_mode', agentMode);
    fd.set('custom_prompt', customPrompt);

    await updateWorkspace(workspace.id, fd);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleDelete = async () => {
    if (confirmText !== workspace.name) return;
    setDeleting(true);
    setDeleteError('');
    const result = await deleteWorkspace(workspace.id);
    if (result.error) {
      setDeleteError(result.error);
      setDeleting(false);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
          Workspace Settings
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Configure <span className="text-indigo-500 dark:text-indigo-400 font-medium">{workspace.name}</span>
        </p>
      </div>

      {/* Business Name */}
      <div className="rounded-xl bg-card backdrop-blur-md border border-border p-5">
        <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Business Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground focus:border-ring focus:ring-1 focus:ring-ring outline-none transition"
        />
        <p className="text-[10px] text-muted-foreground mt-2">The name displayed in your dashboard sidebar, workspace switcher, and used by the AI when introducing itself.</p>
      </div>

      {/* Agent Persona Selector */}
      <div className="rounded-xl bg-card backdrop-blur-md border border-border p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          <h3 className="text-xs font-semibold text-foreground">Agent Persona</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">This determines the tone and vocabulary the AI uses when speaking to your customers. Choose a persona that matches your brand voice.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
          {BOT_PERSONAS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPersona(p.value)}
              className={`text-left px-4 py-3 rounded-xl border transition-all duration-300
                ${persona === p.value
                  ? 'bg-indigo-500/10 border-indigo-500/30 shadow-lg shadow-indigo-500/5'
                  : 'bg-muted/50 border-border hover:border-border/80 hover:bg-muted'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">{p.label}</span>
                {persona === p.value && <Check className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>

        {persona === 'Custom Prompt' && (
          <div className="mt-3">
            <label className="block text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Custom Persona Instructions</label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={4}
              placeholder="e.g. Speak like a friendly boutique concierge. Always mention free shipping over $50."
              className="w-full px-3 py-2.5 rounded-lg bg-muted border border-input text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:ring-1 focus:ring-ring outline-none transition resize-none"
            />
          </div>
        )}
      </div>

      {/* Operating Mode Toggle */}
      <div className="rounded-xl bg-card backdrop-blur-md border border-border p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Bot className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <h3 className="text-xs font-semibold text-foreground">Operating Mode</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">Control how the AI agent handles incoming conversations. Autopilot is recommended for most businesses; use Copilot if you want to review AI drafts before they are sent.</p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {AGENT_MODES.map((mode) => (
            <motion.button
              key={mode.value}
              onClick={() => setAgentMode(mode.value)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`text-left px-4 py-4 rounded-xl border transition-all duration-300
                ${agentMode === mode.value
                  ? 'bg-linear-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 border-indigo-500/30 shadow-lg'
                  : 'bg-muted/50 border-border hover:border-border/80'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <mode.icon className={`w-5 h-5 ${agentMode === mode.value ? 'text-indigo-500 dark:text-indigo-400' : 'text-muted-foreground'}`} />
                {agentMode === mode.value && (
                  <span className="relative flex h-2 w-2 ml-auto">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
              </div>
              <h4 className="text-xs font-semibold text-foreground">{mode.label}</h4>
              <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{mode.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-linear-to-r from-indigo-500 to-purple-600
            hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Save Settings
        </button>
        {saved && (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xs text-emerald-400 flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> Saved
          </motion.span>
        )}
      </div>

      {/* Danger Zone */}
      <div className="rounded-xl bg-rose-500/5 border border-rose-500/20 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          <h3 className="text-xs font-semibold text-rose-600 dark:text-rose-300">Danger Zone</h3>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Deleting <span className="text-foreground font-medium">{workspace.name}</span> permanently removes its conversations, CRM leads, knowledge base, and integrations. This cannot be undone.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={`Type "${workspace.name}" to confirm`}
            className="flex-1 px-3 py-2 rounded-lg bg-card border border-rose-500/30 text-xs text-foreground placeholder:text-muted-foreground/60 focus:border-rose-500 outline-none transition"
          />
          <button
            onClick={handleDelete}
            disabled={deleting || confirmText !== workspace.name}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1.5 shrink-0"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            Delete Business
          </button>
        </div>
        {deleteError && <p className="text-[10px] text-rose-400">{deleteError}</p>}
      </div>
    </div>
  );
}
