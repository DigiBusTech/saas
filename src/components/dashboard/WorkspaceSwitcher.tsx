'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Sparkles,
  X,
  Loader2,
  Lock,
} from 'lucide-react';
import type { Workspace } from '@/lib/types/database';
import { createWorkspace } from '@/app/(dashboard)/dashboard/workspaces/actions';

interface WorkspaceSwitcherProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  currentCount: number;
  maxWorkspaces: number;
}

const BOT_PERSONAS = [
  'Professional English',
  'Casual English',
  'Nigerian Pidgin',
  'Yoruba-Infused English',
  'Hausa-Infused English',
  'Custom Prompt',
];

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  currentCount,
  maxWorkspaces,
}: WorkspaceSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [persona, setPersona] = useState('Professional English');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);
  const limitReached = currentCount >= maxWorkspaces;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    setSlug(
      name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    );
  }, [name]);

  const handleSwitch = (workspaceId: string) => {
    setOpen(false);
    router.push(`/dashboard/${workspaceId}/integrations`);
  };

  const handleCreate = async () => {
    if (!name || !slug) { setError('Name and slug are required'); return; }
    setCreating(true);
    setError('');

    const fd = new FormData();
    fd.set('name', name);
    fd.set('slug', slug);
    fd.set('bot_persona', persona);

    const result = await createWorkspace(fd);
    setCreating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setShowCreateModal(false);
    setName('');
    setSlug('');
    setPersona('Professional English');

    if (result.data) {
      router.push(`/dashboard/${result.data.id}/integrations`);
      router.refresh();
    }
  };

  return (
    <>
      {/* Switcher Trigger */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg
            bg-zinc-900/60 backdrop-blur-md border border-white/10
            hover:border-indigo-500/40 transition-all duration-300 group"
        >
          {activeWorkspace?.logo_url ? (
            <img src={activeWorkspace.logo_url} alt="" className="w-7 h-7 rounded-md object-cover" />
          ) : (
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-white truncate">
              {activeWorkspace?.name ?? 'Select Business'}
            </p>
            <span className="text-[9px] text-indigo-400/80 font-medium">
              {currentCount} / {maxWorkspaces} Businesses
            </span>
          </div>
          <ChevronDown
            className={`w-3.5 h-3.5 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute top-full left-0 right-0 mt-1.5 z-50
                bg-zinc-900/90 backdrop-blur-xl border border-white/10
                rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
            >
              <div className="p-1.5 max-h-60 overflow-auto">
                {workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleSwitch(ws.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left
                      transition-all duration-200 group
                      ${ws.id === activeWorkspaceId
                        ? 'bg-indigo-500/10 border border-indigo-500/20'
                        : 'hover:bg-white/5 border border-transparent'}`}
                  >
                    {ws.logo_url ? (
                      <img src={ws.logo_url} alt="" className="w-6 h-6 rounded-md object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500/20 to-purple-600/20 border border-indigo-500/20 flex items-center justify-center">
                        <Building2 className="w-3 h-3 text-indigo-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{ws.name}</p>
                      <p className="text-[9px] text-gray-500 truncate">/{ws.slug}</p>
                    </div>
                    {ws.id === activeWorkspaceId && (
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    )}
                    {ws.is_active && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Create New Business Button */}
              <div className="border-t border-white/5 p-1.5">
                <button
                  onClick={() => {
                    setOpen(false);
                    if (limitReached) {
                      router.push('/dashboard/billing');
                    } else {
                      setShowCreateModal(true);
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
                    hover:bg-white/5 transition-all duration-200 group"
                >
                  {limitReached ? (
                    <Lock className="w-4 h-4 text-amber-400" />
                  ) : (
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500/10 to-pink-500/10 border border-dashed border-indigo-500/30 flex items-center justify-center">
                      <Plus className="w-3 h-3 text-indigo-400" />
                    </div>
                  )}
                  <span className={`text-xs font-medium ${limitReached ? 'text-amber-400' : 'text-indigo-400 group-hover:text-indigo-300'}`}>
                    {limitReached ? 'Upgrade to Add More' : 'Create New Business'}
                  </span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Workspace Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md mx-4 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Create New Business</h3>
                    <p className="text-[10px] text-gray-500">
                      {currentCount} / {maxWorkspaces} workspaces used
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 transition"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-3 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs"
                  >
                    {error}
                  </motion.div>
                )}

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Business Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. My Online Store"
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600
                      focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">URL Slug</label>
                  <div className="flex items-center gap-0">
                    <span className="px-3 py-2.5 rounded-l-lg bg-zinc-800 border border-r-0 border-white/10 text-xs text-gray-500">
                      /
                    </span>
                    <input
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                      placeholder="my-online-store"
                      className="flex-1 px-3 py-2.5 rounded-r-lg bg-zinc-800/50 border border-white/10 text-sm text-white placeholder:text-gray-600
                        focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5">Bot Persona</label>
                  <select
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-zinc-800/50 border border-white/10 text-sm text-white
                      focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 outline-none transition appearance-none"
                  >
                    {BOT_PERSONAS.map((p) => (
                      <option key={p} value={p} className="bg-zinc-900">{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 pb-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !name || !slug}
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-white
                    bg-gradient-to-r from-indigo-500 to-purple-600
                    hover:from-indigo-400 hover:to-purple-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                    shadow-lg shadow-indigo-500/25 transition-all duration-300
                    flex items-center gap-2"
                >
                  {creating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Create Business
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
