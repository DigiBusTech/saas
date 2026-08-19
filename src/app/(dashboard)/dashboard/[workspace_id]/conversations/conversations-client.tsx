'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Phone, MessageCircle, Bot, User, AlertCircle,
  Check, X, Pencil, Hand, Search, Send,
} from 'lucide-react';
import type { Workspace } from '@/lib/types/database';
import { createBrowserClient } from '@supabase/ssr';
import { approveCopilotDraft } from './actions';

interface Message {
  id: string;
  sender_type: 'user' | 'bot' | 'human';
  content: string;
  approval_status: 'sent' | 'pending_approval' | 'discarded';
  created_at: string;
}

interface ConversationWithMessages {
  id: string;
  platform: 'telegram' | 'whatsapp';
  platform_chat_id: string;
  contact_name: string | null;
  status: 'ai_active' | 'human_handoff' | 'resolved';
  updated_at: string;
  messages: Message[];
}

interface Props {
  workspace: Workspace;
  initialConversations: ConversationWithMessages[];
}

export function ConversationsClient({ workspace, initialConversations }: Props) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState('');
  const [editingDraft, setEditingDraft] = useState<{ id: string; content: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConvo = conversations.find((c) => c.id === activeConvoId);
  const pendingApprovals = activeConvo?.messages.filter((m) => m.approval_status === 'pending_approval') ?? [];

  // Real-time subscription for new messages
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const channel = supabase
      .channel('workspace-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, (payload: any) => {
        const newMsg = payload.new as Message;
        setConversations((prev) =>
          prev.map((c) =>
            c.messages.some((m) => m.id === newMsg.id) ? c :
            { ...c, messages: [...c.messages, newMsg] }
          )
        );
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConvo?.messages.length]);

  const filtered = useMemo(() => {
    if (!search) return conversations;
    const q = search.toLowerCase();
    return conversations.filter((c) =>
      c.contact_name?.toLowerCase().includes(q) || c.platform_chat_id.includes(q)
    );
  }, [conversations, search]);

  const handleApprove = async (msgId: string) => {
    const result = await approveCopilotDraft(workspace.id, msgId);
    if (result.error) return;
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        messages: c.messages.map((m) => m.id === msgId ? { ...m, approval_status: 'sent' as const } : m),
      }))
    );
  };

  const handleDiscard = async (msgId: string) => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.from('messages').update({ approval_status: 'discarded' }).eq('id', msgId);
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        messages: c.messages.map((m) => m.id === msgId ? { ...m, approval_status: 'discarded' as const } : m),
      }))
    );
  };

  const handleEditDraft = async () => {
    if (!editingDraft) return;
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.from('messages').update({ content: editingDraft.content }).eq('id', editingDraft.id);
    setConversations((prev) =>
      prev.map((c) => ({
        ...c,
        messages: c.messages.map((m) => m.id === editingDraft.id ? { ...m, content: editingDraft.content } : m),
      }))
    );
    setEditingDraft(null);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'ai_active': return { label: 'AI Active', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
      case 'human_handoff': return { label: 'Human Takes Over', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
      case 'resolved': return { label: 'Resolved', color: 'text-gray-400 bg-zinc-800 border-white/5' };
      default: return { label: status, color: 'text-gray-400 bg-zinc-800 border-white/5' };
    }
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] -m-6 overflow-hidden">
      {/* Left Sidebar: Chat Threads */}
      <div className="w-72 border-r border-white/5 flex flex-col bg-zinc-950/50">
        <div className="p-3 border-b border-white/5">
          <h2 className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            Conversations
          </h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900/60 border border-white/10 text-[11px] text-white placeholder:text-gray-600 focus:border-indigo-500/40 outline-none transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-1.5 space-y-0.5">
          {filtered.map((convo) => {
            const unread = convo.messages.filter((m) => m.approval_status === 'pending_approval').length;
            const lastMsg = convo.messages[convo.messages.length - 1];
            const statusInfo = getStatusInfo(convo.status);

            return (
              <button
                key={convo.id}
                onClick={() => setActiveConvoId(convo.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-200
                  ${convo.id === activeConvoId
                    ? 'bg-indigo-500/10 border border-indigo-500/20'
                    : 'hover:bg-white/5 border border-transparent'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {convo.platform === 'telegram'
                      ? <MessageCircle className="w-3 h-3 text-sky-400 shrink-0" />
                      : <Phone className="w-3 h-3 text-emerald-400 shrink-0" />}
                    <span className="text-[11px] text-white font-medium truncate">{convo.contact_name || 'Unknown'}</span>
                  </div>
                  {unread > 0 && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-amber-500 text-[8px] font-bold text-black">{unread}</span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 truncate">{lastMsg?.content ?? 'No messages'}</p>
                <div className="mt-1">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-[10px] text-gray-600 text-center py-8">No conversations yet</p>
          )}
        </div>
      </div>

      {/* Main Chat Window */}
      <div className="flex-1 flex flex-col bg-zinc-950/30">
        {activeConvo ? (
          <>
            {/* Chat Header */}
            <div className="h-12 border-b border-white/5 flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                {activeConvo.platform === 'telegram'
                  ? <MessageCircle className="w-4 h-4 text-sky-400" />
                  : <Phone className="w-4 h-4 text-emerald-400" />}
                <span className="text-xs font-medium text-white">{activeConvo.contact_name || 'Unknown'}</span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] border ${getStatusInfo(activeConvo.status).color}`}>
                  {getStatusInfo(activeConvo.status).label}
                </span>
              </div>
              <button className="px-3 py-1 rounded-lg text-[10px] text-amber-400 border border-amber-500/20 hover:bg-amber-500/10 transition flex items-center gap-1">
                <Hand className="w-3 h-3" /> Human Takeover
              </button>
            </div>

            {/* Copilot Approval Banner */}
            <AnimatePresence>
              {pendingApprovals.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-amber-500/5 border-b border-amber-500/10 flex items-center gap-3">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-[11px] text-amber-300 flex-1">
                      {pendingApprovals.length} AI draft{pendingApprovals.length > 1 ? 's' : ''} awaiting your approval
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {activeConvo.messages
                .filter((m) => m.approval_status !== 'discarded')
                .map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.sender_type === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[75%] ${
                    msg.sender_type === 'user'
                      ? 'bg-zinc-800/60'
                      : msg.approval_status === 'pending_approval'
                        ? 'bg-amber-500/10 border border-amber-500/20'
                        : 'bg-indigo-500/10 border border-indigo-500/20'
                  } rounded-xl px-4 py-2.5 backdrop-blur-md`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      {msg.sender_type === 'user' ? (
                        <User className="w-3 h-3 text-gray-500" />
                      ) : (
                        <Bot className="w-3 h-3 text-indigo-400" />
                      )}
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider">
                        {msg.sender_type === 'user' ? 'Customer' : 'AI Assistant'}
                      </span>
                      {msg.approval_status === 'pending_approval' && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 ml-1">DRAFT</span>
                      )}
                    </div>

                    {editingDraft?.id === msg.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={editingDraft.content}
                          onChange={(e) => setEditingDraft({ ...editingDraft, content: e.target.value })}
                          rows={3}
                          className="w-full px-2 py-1.5 rounded-lg bg-zinc-800 border border-white/10 text-xs text-white resize-none outline-none"
                        />
                        <div className="flex gap-2">
                          <button onClick={handleEditDraft} className="px-2 py-1 rounded text-[9px] bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition">Save</button>
                          <button onClick={() => setEditingDraft(null)} className="px-2 py-1 rounded text-[9px] text-gray-500 hover:text-white transition">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}

                    {/* Copilot Approval Buttons */}
                    {msg.approval_status === 'pending_approval' && !editingDraft && (
                      <div className="flex gap-2 mt-2 pt-2 border-t border-white/5">
                        <button onClick={() => handleApprove(msg.id)}
                          className="flex-1 py-1.5 rounded-lg text-[10px] font-medium text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition flex items-center justify-center gap-1">
                          <Check className="w-3 h-3" /> Approve & Send
                        </button>
                        <button onClick={() => setEditingDraft({ id: msg.id, content: msg.content })}
                          className="py-1.5 px-2.5 rounded-lg text-[10px] text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition flex items-center gap-1">
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button onClick={() => handleDiscard(msg.id)}
                          className="py-1.5 px-2.5 rounded-lg text-[10px] text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 transition flex items-center gap-1">
                          <X className="w-3 h-3" /> Discard
                        </button>
                      </div>
                    )}

                    <p className="text-[8px] text-gray-600 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input (for human messages) */}
            <div className="border-t border-white/5 p-3">
              <div className="flex gap-2">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a human reply..."
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-900/60 border border-white/10 text-xs text-white placeholder:text-gray-600 focus:border-indigo-500/40 outline-none transition"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); /* send */ } }}
                />
                <button className="px-4 py-2 rounded-lg bg-linear-to-r from-indigo-500 to-purple-600 text-white text-xs font-medium shadow-lg shadow-indigo-500/25 hover:from-indigo-400 hover:to-purple-500 transition flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Select a conversation to view</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
