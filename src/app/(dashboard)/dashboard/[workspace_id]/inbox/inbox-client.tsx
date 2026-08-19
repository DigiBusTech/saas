'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getChatMessages, getInboxConversations, setAIStatus, sendManualMessage } from './actions';
import type { WorkspaceCRM, ChatMessage } from '@/lib/types/database';
import { Send, Bot, User, Loader2, MessageSquare, Search } from 'lucide-react';

interface Props {
  workspaceId: string;
  initialConversations: WorkspaceCRM[];
}

// Small inline platform icons
function PlatformIcon({ platform }: { platform: string }) {
  if (platform === 'whatsapp') {
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-bold" title="WhatsApp">
        W
      </span>
    );
  }
  if (platform === 'web') {
    return (
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-violet-500/20 text-violet-400 text-[9px] font-bold" title="Web chat">
        C
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 text-[9px] font-bold" title="Telegram">
      T
    </span>
  );
}

function formatTime(iso: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function InboxClient({ workspaceId, initialConversations }: Props) {
  const [conversations, setConversations] = useState<WorkspaceCRM[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [composer, setComposer] = useState('');
  const [search, setSearch] = useState('');
  const [isSending, startSending] = useTransition();
  const [isToggling, startToggling] = useTransition();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');

  const supabase = useRef(createClient());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  activeIdRef.current = activeId;

  const activeContact = conversations.find((c) => c.id === activeId) ?? null;

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) setNotificationPermission(Notification.permission);
  }, []);

  const enableNotifications = async () => {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  // Load message history when a conversation is selected
  const selectConversation = useCallback(async (crmId: string) => {
    setActiveId(crmId);
    setLoadingMessages(true);
    const history = await getChatMessages(workspaceId, crmId);
    setMessages(history);
    setLoadingMessages(false);
    scrollToBottom();
  }, [workspaceId, scrollToBottom]);

  // ---- Realtime subscription: chat_messages INSERT + workspace_crm UPDATE ----
  useEffect(() => {
    const client = supabase.current;
    const channel = client
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          // Only append if it belongs to the currently open conversation
          if (msg.crm_id === activeIdRef.current) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            scrollToBottom();
          }
          if (msg.sender_type === 'user') {
            setUnreadCount((count) => count + 1);
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification('New message in SabiBio Inbox', {
                body: msg.content,
                tag: `inbox-${msg.crm_id}`,
              });
            }
          }
          // Bump the conversation to the top of the list
          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === msg.crm_id);
            if (idx === -1) {
              void getInboxConversations(workspaceId).then((latest) => setConversations(latest));
              return prev;
            }
            const updated = { ...prev[idx], last_interaction: msg.created_at };
            const rest = prev.filter((c) => c.id !== msg.crm_id);
            return [updated, ...rest];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'workspace_crm',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          const updated = payload.new as WorkspaceCRM;
          setConversations((prev) =>
            prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))
          );
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [workspaceId, scrollToBottom]);

  // ---- AI toggle ----
  function handleToggleAI(next: boolean) {
    if (!activeContact) return;
    const status = next ? 'active' : 'paused';
    // Optimistic update
    setConversations((prev) =>
      prev.map((c) => (c.id === activeContact.id ? { ...c, ai_status: status } : c))
    );
    startToggling(async () => {
      await setAIStatus(workspaceId, activeContact.id, status);
    });
  }

  // ---- Send manual message ----
  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeContact || !composer.trim()) return;
    const text = composer.trim();
    setComposer('');
    startSending(async () => {
      await sendManualMessage(workspaceId, activeContact.id, text);
      // The realtime INSERT event will append the message; no manual push needed.
    });
  }

  const filtered = conversations.filter((c) =>
    (c.customer_name ?? c.platform_user_id ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const aiActive = activeContact?.ai_status !== 'paused';

  return (
    <div className="flex h-[calc(100vh-6rem)] rounded-xl overflow-hidden border border-white/10 bg-zinc-900/40 backdrop-blur-md">
      {/* ---------- Left Pane: Conversation list ---------- */}
      <div className="w-full max-w-xs border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h1 className="text-sm font-semibold text-white flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-indigo-400" /> Unified Inbox
            {unreadCount > 0 && <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[9px] text-white">{unreadCount}</span>}
          </h1>
          {notificationPermission === 'default' && (
            <button type="button" onClick={enableNotifications} className="mb-3 text-[10px] text-indigo-300 hover:text-indigo-200">
              Enable browser notifications
            </button>
          )}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-600" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-zinc-800/50 border border-white/10 text-xs text-white outline-none focus:border-indigo-500/40 transition"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-600">No conversations yet.</div>
          ) : (
            filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => selectConversation(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/3 transition flex items-start gap-3 ${
                  activeId === c.id ? 'bg-white/5' : ''
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                  {(c.customer_name ?? c.platform_user_id ?? '?').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <PlatformIcon platform={c.platform} />
                      <span className="text-xs font-medium text-white truncate">
                        {c.customer_name ?? c.platform_user_id}
                      </span>
                    </div>
                    <span className="text-[9px] text-gray-600 shrink-0">{formatTime(c.last_interaction)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {c.ai_status === 'paused' ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Human</span>
                    ) : (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">AI Active</span>
                    )}
                    {c.category && (
                      <span className="text-[9px] text-gray-500 truncate">{c.category}</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ---------- Right Pane: Active chat window ---------- */}
      <div className="flex-1 flex flex-col min-w-0">
        {!activeContact ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
            <MessageSquare className="w-10 h-10 mb-3 text-gray-700" />
            <p className="text-xs">Select a conversation to view the chat</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-xs font-semibold text-white">
                  {(activeContact.customer_name ?? activeContact.platform_user_id ?? '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <PlatformIcon platform={activeContact.platform} />
                    <span className="text-sm font-medium text-white">
                      {activeContact.customer_name ?? activeContact.platform_user_id}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {activeContact.platform === 'web' ? 'Web chat' : activeContact.platform === 'telegram' ? 'Telegram' : 'WhatsApp'}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {activeContact.phone_number ?? activeContact.platform_user_id}
                  </span>
                </div>
              </div>

              {/* AI Agent Active toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className={`text-[11px] font-medium ${aiActive ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {aiActive ? 'AI Agent Active' : 'Human Override'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={aiActive}
                  disabled={isToggling}
                  onClick={() => handleToggleAI(!aiActive)}
                  className={`relative w-10 h-5 rounded-full transition ${aiActive ? 'bg-emerald-500/70' : 'bg-zinc-600'} disabled:opacity-50`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${aiActive ? 'translate-x-5' : ''}`}
                  />
                </button>
              </label>
            </div>

            {/* Message history */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full text-gray-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-600">
                  No messages in this conversation yet.
                </div>
              ) : (
                messages.map((m) => {
                  const isInbound = m.direction === 'inbound';
                  return (
                    <div key={m.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isInbound
                            ? 'bg-zinc-800/70 text-gray-200'
                            : m.sender_type === 'human_agent'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-purple-600/80 text-white'
                        }`}
                      >
                        {!isInbound && (
                          <div className="flex items-center gap-1 mb-0.5 opacity-80">
                            {m.sender_type === 'human_agent' ? (
                              <User className="w-3 h-3" />
                            ) : (
                              <Bot className="w-3 h-3" />
                            )}
                            <span className="text-[9px] uppercase tracking-wide">
                              {m.sender_type === 'human_agent' ? 'Agent' : 'AI'}
                            </span>
                          </div>
                        )}
                        <p className="text-xs whitespace-pre-wrap wrap-break-word">{m.content}</p>
                        <span className="block text-[9px] opacity-60 mt-1 text-right">{formatTime(m.created_at)}</span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <form onSubmit={handleSend} className="p-4 border-t border-white/10 flex items-center gap-2">
              <input
                value={composer}
                onChange={(e) => setComposer(e.target.value)}
                placeholder={aiActive ? 'Pause AI to reply, or send anyway...' : 'Type your reply...'}
                className="flex-1 px-4 py-2.5 rounded-full bg-zinc-800/50 border border-white/10 text-sm text-white outline-none focus:border-indigo-500/40 transition"
              />
              <button
                type="submit"
                disabled={isSending || !composer.trim()}
                className="w-10 h-10 rounded-full bg-linear-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white disabled:opacity-40 hover:from-indigo-400 hover:to-purple-500 transition"
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
