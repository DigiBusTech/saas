'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { setConversationStatus, sendOperatorReply } from './actions';

interface Props {
  conversations: any[];
  tenantId: string;
  operatorName: string;
}

export function ConversationsClient({ conversations: initialConversations, tenantId, operatorName }: Props) {
  const supabase = createClient();
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [replyMessage, setReplyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const selected = conversations.find((c: any) => c.id === selectedId);
  const isHandoff = selected?.status === 'human_handoff';

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedId) return;
    setLoadingMessages(true);
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', selectedId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        setMessages(data ?? []);
        setLoadingMessages(false);
      });
  }, [selectedId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Supabase Realtime: listen for new messages
  useEffect(() => {
    const channel = supabase
      .channel('messages-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new;
          // Only append if it's for the currently selected conversation
          if (newMsg.conversation_id === selectedId) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedId]);

  // Realtime: listen for conversation status changes
  useEffect(() => {
    const channel = supabase
      .channel('conversations-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations' },
        (payload) => {
          setConversations((prev) =>
            prev.map((c: any) => c.id === payload.new.id ? { ...c, ...payload.new } : c)
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        (payload) => {
          setConversations((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  function handleStatusToggle() {
    if (!selectedId) return;
    const newStatus = isHandoff ? 'ai_active' : 'human_handoff';
    startTransition(async () => {
      await setConversationStatus(selectedId, newStatus);
      setConversations((prev) =>
        prev.map((c: any) => c.id === selectedId ? { ...c, status: newStatus } : c)
      );
    });
  }

  async function handleSendReply(formData: FormData) {
    setReplyMessage(null);
    const result = await sendOperatorReply(formData);
    if (result?.error) {
      setReplyMessage({ type: 'error', text: result.error });
    } else {
      setReplyMessage({ type: 'success', text: 'Sent!' });
      // Optimistically add the message
      const content = formData.get('content') as string;
      setMessages((prev) => [...prev, {
        id: crypto.randomUUID(),
        conversation_id: selectedId,
        sender_type: 'human',
        sender_name: operatorName,
        content,
        created_at: new Date().toISOString(),
      }]);
      // Clear input
      const form = document.getElementById('reply-form') as HTMLFormElement;
      form?.reset();
      setTimeout(() => setReplyMessage(null), 2000);
    }
  }

  const handoffCount = conversations.filter((c: any) => c.status === 'human_handoff').length;

  return (
    <div className="flex gap-4 h-[calc(100vh-7rem)]">
      {/* Sidebar: Conversation List */}
      <div className="w-72 bg-[#0F1219] border border-gray-800 rounded-lg flex flex-col shrink-0 overflow-hidden">
        <div className="p-3 border-b border-gray-800 bg-[#0B0E14]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Threads</span>
            <span className="text-[10px] text-gray-500 font-mono">{conversations.length}</span>
          </div>
          {handoffCount > 0 && (
            <div className="mt-2 text-[9px] px-2 py-1 bg-amber-950/30 border border-amber-900/30 rounded text-amber-400 font-bold animate-pulse">
              ⚠ {handoffCount} awaiting human response
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-gray-800/40">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-500">
              No conversations yet. Messages will appear here once your integrations receive traffic.
            </div>
          ) : (
            conversations.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full text-left p-3 hover:bg-gray-900/40 transition ${selectedId === c.id ? 'bg-gray-900/60 border-l-2 border-indigo-500' : 'border-l-2 border-transparent'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-white font-medium truncate">
                    {c.contact_name ?? c.platform_chat_id}
                  </span>
                  <span className={`text-[7px] px-1 py-0.5 rounded font-bold uppercase ${
                    c.platform === 'telegram' ? 'bg-sky-950/40 text-sky-400 border border-sky-900/30' : c.platform === 'web' ? 'bg-violet-950/40 text-violet-400 border border-violet-900/30' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                  }`}>{c.platform === 'telegram' ? 'TG' : c.platform === 'web' ? 'WEB' : 'WA'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {c.status === 'human_handoff' ? (
                    <span className="text-[7px] px-1 py-0.5 bg-amber-950/40 text-amber-400 border border-amber-900/30 rounded font-bold uppercase animate-pulse">HANDOFF</span>
                  ) : c.status === 'resolved' ? (
                    <span className="text-[7px] px-1 py-0.5 bg-gray-800 text-gray-500 rounded font-bold uppercase">RESOLVED</span>
                  ) : (
                    <span className="text-[7px] px-1 py-0.5 bg-indigo-950/30 text-indigo-400 border border-indigo-900/20 rounded font-bold uppercase">AI</span>
                  )}
                  <span className="text-[9px] text-gray-500">
                    {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 bg-[#0F1219] border rounded-lg flex flex-col overflow-hidden ${isHandoff ? 'border-amber-900/50' : 'border-gray-800'}`}>
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-center p-8">
            <div>
              <svg className="w-12 h-12 text-indigo-500/30 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
              </svg>
              <h3 className="text-sm font-semibold text-white">No Conversation Selected</h3>
              <p className="text-xs text-gray-500 mt-1">Select a thread from the sidebar to view messages.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className={`p-3 border-b flex items-center justify-between shrink-0 ${isHandoff ? 'bg-amber-950/20 border-amber-900/40' : 'bg-[#0B0E14] border-gray-800'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white">{selected.contact_name ?? selected.platform_chat_id}</h3>
                  <span className={`text-[7px] px-1 py-0.5 rounded font-bold uppercase ${
                    selected.platform === 'telegram' ? 'bg-sky-950/40 text-sky-400 border border-sky-900/30' : selected.platform === 'web' ? 'bg-violet-950/40 text-violet-400 border border-violet-900/30' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/30'
                  }`}>{selected.platform === 'web' ? 'Web Chat' : selected.platform}</span>
                </div>
                {isHandoff && (
                  <p className="text-[9px] text-amber-400 mt-0.5 font-semibold">⚠ AI paused — Human operator mode active</p>
                )}
              </div>
              <button
                onClick={handleStatusToggle}
                disabled={isPending}
                className={`text-[10px] px-3 py-1.5 rounded font-bold transition disabled:opacity-50 ${
                  isHandoff
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {isHandoff ? 'Return to AI Bot' : 'Pause AI & Engage Operator'}
              </button>
            </div>

            {/* Handoff Banner */}
            {isHandoff && (
              <div className="px-4 py-2 bg-amber-950/10 border-b border-amber-900/30 text-[9px] text-amber-300 text-center font-medium">
                AI automation is paused for this conversation. Type a reply below to respond manually.
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#07090e]">
              {loadingMessages ? (
                <div className="p-8 text-center text-xs text-gray-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500">No messages in this thread yet.</div>
              ) : (
                messages.map((msg: any) => {
                  const isClient = msg.sender_type === 'user';
                  const isHuman = msg.sender_type === 'human';
                  const isBot = msg.sender_type === 'bot';

                  let authorLabel = 'Client';
                  let bubbleClass = 'bg-[#1F2937]/40 text-gray-300 border-gray-800 rounded-tl-none';
                  if (isHuman) {
                    authorLabel = `Staff: ${msg.sender_name ?? 'Operator'}`;
                    bubbleClass = 'bg-amber-950/20 border-amber-900/25 text-amber-200 rounded-tr-none';
                  } else if (isBot) {
                    authorLabel = 'AI Assistant';
                    bubbleClass = 'bg-indigo-950/25 border-indigo-900/20 text-indigo-300 rounded-tr-none';
                  }

                  return (
                    <div key={msg.id} className={`flex flex-col max-w-[80%] ${isClient ? 'self-start' : 'self-end ml-auto text-right'}`}>
                      <span className="text-[8px] font-mono px-1 mb-0.5 uppercase text-gray-500 tracking-wider">
                        {authorLabel}
                      </span>
                      <div className={`p-3 text-left rounded-lg border text-xs leading-relaxed inline-block ${bubbleClass}`}>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <span className={`block text-[7px] text-gray-600 mt-1.5 ${isClient ? '' : 'text-right'} font-mono`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Operator Reply Input */}
            <div className={`p-3 border-t shrink-0 ${isHandoff ? 'border-amber-900/40 bg-amber-950/5' : 'border-gray-800 bg-[#0F1219]'}`}>
              {replyMessage && (
                <div className={`mb-2 p-2 rounded text-[10px] ${replyMessage.type === 'success' ? 'bg-emerald-950/30 text-emerald-300' : 'bg-rose-950/30 text-rose-300'}`}>
                  {replyMessage.text}
                </div>
              )}
              <form id="reply-form" action={handleSendReply} className="flex gap-2">
                <input type="hidden" name="conversation_id" value={selectedId ?? ''} />
                <textarea
                  name="content"
                  rows={2}
                  required
                  placeholder={isHandoff ? `Reply as ${operatorName}...` : 'Switch to human mode to reply manually...'}
                  disabled={!isHandoff}
                  className="flex-1 bg-[#0B0E14] border border-gray-800 rounded p-2 text-xs text-white focus:ring-1 focus:ring-indigo-500 outline-none resize-none disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={!isHandoff}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold w-24 rounded text-xs flex flex-col items-center justify-center gap-1 shrink-0 transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Send
                </button>
              </form>
              <p className="text-[8px] text-gray-600 mt-1.5">
                {isHandoff
                  ? '🔒 AI is paused. Your replies are dispatched via the platform API and logged in the database.'
                  : 'Click "Pause AI & Engage Operator" to enable manual replies.'}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
