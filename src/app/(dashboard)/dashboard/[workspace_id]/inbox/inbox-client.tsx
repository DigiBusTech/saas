'use client';

import { useState, useEffect, useRef, useCallback, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getChatMessages, getInboxConversations, setAIStatus, sendManualMessage } from './actions';
import type { WorkspaceCRM, ChatMessage } from '@/lib/types/database';
import { Send, Bot, User, Loader2, MessageSquare, Search, ArrowLeft, Paperclip, Check, CheckCheck } from 'lucide-react';

interface Props {
  workspaceId: string;
  initialConversations: WorkspaceCRM[];
}

// Platform icons with WhatsApp colors
function PlatformIcon({ platform }: { platform: string }) {
  if (platform === 'whatsapp') {
    return (
      <div className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white" title="WhatsApp">
        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      </div>
    );
  }
  if (platform === 'web') {
    return (
      <div className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-violet-500 text-white text-[9px] font-bold" title="Web chat">
        C
      </div>
    );
  }
  return (
    <div className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-sky-500 text-white text-[9px] font-bold" title="Telegram">
      T
    </div>
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

// Generate initials from name
function getInitials(name: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
}

// Generate consistent avatar color based on name
function getAvatarColor(name: string | null): string {
  if (!name) return 'bg-gradient-to-br from-gray-400 to-gray-600';
  const colors = [
    'bg-gradient-to-br from-blue-400 to-blue-600',
    'bg-gradient-to-br from-green-400 to-green-600',
    'bg-gradient-to-br from-purple-400 to-purple-600',
    'bg-gradient-to-br from-pink-400 to-pink-600',
    'bg-gradient-to-br from-indigo-400 to-indigo-600',
    'bg-gradient-to-br from-orange-400 to-orange-600',
    'bg-gradient-to-br from-cyan-400 to-cyan-600',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
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

  const supabase = useRef(createClient());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  const activeContact = conversations.find((c) => c.id === activeId) ?? null;

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

  // Realtime subscription
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
          if (msg.crm_id === activeIdRef.current) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            scrollToBottom();
          }
          // Bump conversation to top
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

  // AI toggle
  function handleToggleAI(next: boolean) {
    if (!activeContact) return;
    const status = next ? 'active' : 'paused';
    setConversations((prev) =>
      prev.map((c) => (c.id === activeContact.id ? { ...c, ai_status: status } : c))
    );
    startToggling(async () => {
      await setAIStatus(workspaceId, activeContact.id, status);
    });
  }

  // Send manual message
  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!activeContact || !composer.trim()) return;
    const text = composer.trim();
    setComposer('');
    startSending(async () => {
      await sendManualMessage(workspaceId, activeContact.id, text);
    });
  }

  const filtered = conversations.filter((c) =>
    (c.customer_name ?? c.platform_user_id ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const aiActive = activeContact?.ai_status !== 'paused';

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-background shadow-2xl rounded-lg overflow-hidden border border-border/50">
      {/* ---------- LEFT PANE: CHAT LIST (WhatsApp Style) ---------- */}
      <div className={`${activeId ? 'hidden md:flex' : 'flex'} w-full md:w-96 border-r border-border/50 flex-col bg-card`}>
        {/* Header */}
        <div className="bg-card border-b border-border/50 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-500" />
              Inbox
            </h1>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-10 pr-3 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-background transition"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No conversations yet.</div>
          ) : (
            filtered.map((c) => {
              const isActive = activeId === c.id;
              const displayName = c.customer_name ?? c.platform_user_id ?? 'Unknown';
              
              return (
                <button
                  key={c.id}
                  onClick={() => selectConversation(c.id)}
                  className={`w-full text-left px-4 py-3 border-b border-border/30 hover:bg-muted/40 transition flex items-center gap-3 ${
                    isActive ? 'bg-primary/10' : ''
                  }`}
                >
                  {/* Circular Avatar */}
                  <div className={`w-12 h-12 rounded-full ${getAvatarColor(displayName)} flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md`}>
                    {getInitials(displayName)}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Name and timestamp row */}
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                        {displayName}
                        <PlatformIcon platform={c.platform} />
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatTime(c.last_interaction)}
                      </span>
                    </div>

                    {/* Last message preview and status */}
                    <div className="flex items-center gap-2">
                      {c.ai_status === 'paused' ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400 font-medium">
                          Human
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-medium">
                          AI
                        </span>
                      )}
                      {c.category && (
                        <span className="text-xs text-muted-foreground truncate">{c.category}</span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ---------- RIGHT PANE: CONVERSATION VIEW (WhatsApp Style) ---------- */}
      <div className={`${activeId ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0 relative`}>
        {!activeContact ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/10">
            <MessageSquare className="w-16 h-16 mb-4 text-muted-foreground/30" />
            <p className="text-sm font-medium">Select a conversation to start messaging</p>
          </div>
        ) : (
          <>
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 bg-card border-b border-border/50 px-4 py-3 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                {/* Back button on mobile */}
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="md:hidden flex items-center justify-center w-9 h-9 rounded-full hover:bg-muted transition"
                  aria-label="Back to conversations"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full ${getAvatarColor(activeContact.customer_name ?? activeContact.platform_user_id)} flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-md`}>
                  {getInitials(activeContact.customer_name ?? activeContact.platform_user_id)}
                </div>

                {/* Contact Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {activeContact.customer_name ?? activeContact.platform_user_id}
                    </span>
                    <PlatformIcon platform={activeContact.platform} />
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {activeContact.phone_number ?? activeContact.platform_user_id}
                  </span>
                </div>
              </div>

              {/* AI Toggle Switch */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className={`text-xs font-medium ${aiActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {aiActive ? '🤖 AI Active' : '👤 Human'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={aiActive}
                  disabled={isToggling}
                  onClick={() => handleToggleAI(!aiActive)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${aiActive ? 'bg-emerald-500' : 'bg-muted-foreground/40'} disabled:opacity-50`}
                >
                  <span
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${aiActive ? 'translate-x-5' : ''}`}
                  />
                </button>
              </label>
            </div>

            {/* Chat Canvas (WhatsApp-style background) */}
            <div className="flex-1 overflow-y-auto px-6 py-4 bg-[#EFEAE2] dark:bg-background/50 relative">
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }} />

              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((m) => {
                    const isInbound = m.direction === 'inbound';
                    return (
                      <div key={m.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
                        <div
                          className={`max-w-[75%] md:max-w-[65%] rounded-lg px-3 py-2 shadow-sm ${
                            isInbound
                              ? 'bg-white dark:bg-card text-foreground rounded-tl-none'
                              : m.sender_type === 'human_agent'
                              ? 'bg-[#D9FDD3] dark:bg-emerald-900/40 text-foreground rounded-tr-none'
                              : 'bg-[#D9FDD3] dark:bg-emerald-900/40 text-foreground rounded-tr-none'
                          }`}
                        >
                          {/* Sender label for outbound */}
                          {!isInbound && (
                            <div className="flex items-center gap-1 mb-1 opacity-70">
                              {m.sender_type === 'human_agent' ? (
                                <>
                                  <User className="w-3 h-3" />
                                  <span className="text-[9px] font-semibold uppercase tracking-wide">Agent</span>
                                </>
                              ) : (
                                <>
                                  <Bot className="w-3 h-3" />
                                  <span className="text-[9px] font-semibold uppercase tracking-wide">AI</span>
                                </>
                              )}
                            </div>
                          )}

                          {/* Message content */}
                          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {m.content}
                          </p>

                          {/* Timestamp and read receipt */}
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-[10px] text-muted-foreground/80">
                              {formatTime(m.created_at)}
                            </span>
                            {!isInbound && (
                              <CheckCheck className="w-3 h-3 text-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Sticky Input Area */}
            <form onSubmit={handleSend} className="sticky bottom-0 bg-card border-t border-border/50 px-4 py-3 flex items-end gap-2">
              <button
                type="button"
                className="flex items-center justify-center w-10 h-10 rounded-full text-muted-foreground hover:bg-muted transition shrink-0"
                aria-label="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              <div className="flex-1 relative">
                <textarea
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  placeholder={aiActive ? 'Type a message or pause AI to take over...' : 'Type your message...'}
                  rows={1}
                  className="w-full px-4 py-2.5 rounded-full bg-muted/50 border border-border/50 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50 focus:bg-background transition resize-none max-h-32"
                  style={{
                    minHeight: '42px',
                    height: 'auto',
                    overflowY: composer.split('\n').length > 3 ? 'auto' : 'hidden'
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={isSending || !composer.trim()}
                className="flex items-center justify-center w-11 h-11 rounded-full bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 transition shadow-lg shrink-0"
                aria-label="Send message"
              >
                {isSending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
