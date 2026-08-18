'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Loader2, MessageCircle, Send, X } from 'lucide-react';

interface Props { workspaceId: string; welcomeMessage: string; primary: string; }
interface Visitor { name: string; email: string; }

export function WebChatDrawer({ workspaceId, welcomeMessage, primary }: Props) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [identity, setIdentity] = useState<Visitor>({ name: '', email: '' });
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const key = `sabibio_session_${workspaceId}`;
    const existing = window.localStorage.getItem(key) || crypto.randomUUID();
    window.localStorage.setItem(key, existing);
    setSessionId(existing);
    const savedVisitor = window.localStorage.getItem(`sabibio_visitor_${workspaceId}`);
    if (savedVisitor) { try { setVisitor(JSON.parse(savedVisitor) as Visitor); } catch {} }
  }, [workspaceId]);

  function openChat() {
    setOpen(true);
    if (messages.length === 0) setMessages([{ role: 'assistant', content: welcomeMessage }]);
  }

  function startChat(event: FormEvent) {
    event.preventDefault();
    if (!identity.name.trim() || !identity.email.includes('@')) { setError('Enter your name and a valid email address.'); return; }
    window.localStorage.setItem(`sabibio_visitor_${workspaceId}`, JSON.stringify(identity));
    setVisitor(identity);
    setError('');
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || !sessionId || !visitor || sending) return;
    setInput('');
    setMessages((current) => [...current, { role: 'user', content }]);
    setSending(true);
    try {
      const response = await fetch('/api/chat/web', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId, sessionId, content, visitorName: visitor.name, visitorEmail: visitor.email }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The chat service is unavailable.');
      setMessages((current) => [...current, { role: 'assistant', content: data.reply || 'Your message is queued for the team.' }]);
    } catch (caught) {
      setMessages((current) => [...current, { role: 'assistant', content: caught instanceof Error ? caught.message : 'The chat service is unavailable.' }]);
    } finally { setSending(false); }
  }

  return <>
    <button onClick={openChat} className="flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-bold text-black transition hover:brightness-110" style={{ background: primary }}><MessageCircle className="h-4 w-4" /> Chat with us</button>
    {open && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"><div className="flex h-[min(620px,calc(100vh-2rem))] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1620] shadow-2xl"><header className="flex items-center justify-between border-b border-white/10 px-4 py-3"><div><p className="text-sm font-semibold text-white">Chat with our team</p><p className="text-[10px] text-white/40">Powered by Sabi AI</p></div><button onClick={() => setOpen(false)} className="text-white/50 hover:text-white"><X className="h-4 w-4" /></button></header>{!visitor ? <form onSubmit={startChat} className="space-y-3 p-5"><p className="text-xs leading-5 text-white/60">Before we begin, tell us where to send a follow-up.</p><input value={identity.name} onChange={(event) => setIdentity({ ...identity, name: event.target.value })} placeholder="Your name" className="field" required /><input type="email" value={identity.email} onChange={(event) => setIdentity({ ...identity, email: event.target.value })} placeholder="Email address" className="field" required />{error && <p className="text-[10px] text-rose-300">{error}</p>}<button className="w-full rounded-lg py-2.5 text-xs font-bold text-black" style={{ background: primary }}>Start chat</button></form> : <><div className="flex-1 space-y-3 overflow-y-auto p-4">{messages.map((message, index) => <div key={`${message.role}-${index}`} className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-5 ${message.role === 'user' ? 'ml-auto text-black' : 'bg-white/5 text-white/80'}`} style={message.role === 'user' ? { background: primary } : undefined}>{message.content}</div>)}{sending && <div className="flex items-center gap-2 text-[10px] text-white/40"><Loader2 className="h-3 w-3 animate-spin" /> Thinking...</div>}</div><form onSubmit={sendMessage} className="flex gap-2 border-t border-white/10 p-3"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Write a message..." className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-white outline-none focus:border-white/30" /><button type="submit" disabled={sending || !input.trim()} className="rounded-lg p-2.5 text-black disabled:opacity-40" style={{ background: primary }}><Send className="h-4 w-4" /></button></form></>}</div></div>}
  </>;
}
