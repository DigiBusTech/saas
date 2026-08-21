'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';

interface DemoMessage {
  id: string;
  role: 'visitor' | 'assistant';
  content: string;
}

const CANNED_REPLIES: Array<{ trigger: RegExp; reply: string }> = [
  {
    trigger: /price|cost|plan|pricing/i,
    reply:
      "We have three plans starting from $19/mo. Each includes a live inbox, AI agent, CRM, and your SabiBio link-in-bio page. Want me to open the pricing details?",
  },
  {
    trigger: /order|track|status/i,
    reply:
      "I can look up any order by its code. In a real workspace I'd pull your order from Supabase and share tracking, invoice, and delivery ETA in one message.",
  },
  {
    trigger: /whatsapp|telegram|channel|integrat/i,
    reply:
      "SabiBio connects WhatsApp Cloud, Telegram Bot, and an embeddable web widget into one inbox. Handoff to a human is one click and never loses context.",
  },
  {
    trigger: /human|agent|talk to (someone|a person)|escalat/i,
    reply:
      "Anytime a conversation feels heated or needs a person, the AI pauses itself and pings your team. You can jump in with full history and warm context.",
  },
  {
    trigger: /rag|knowledge|source|hallucin/i,
    reply:
      "Answers are grounded in your knowledge base via pgvector semantic search. If the AI doesn't know, it says so — no hallucinations, no invented policies.",
  },
];

const QUICK_PROMPTS = [
  'How does pricing work?',
  'How do I track an order?',
  'Which channels are supported?',
];

function getReply(input: string): string {
  const match = CANNED_REPLIES.find((r) => r.trigger.test(input));
  if (match) return match.reply;
  return "This is a live preview of SabiBio's chat agent. In your workspace it answers using your knowledge base, product catalog, and order data.";
}

export function LiveDemoChat() {
  const [messages, setMessages] = useState<DemoMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi 👋 I'm the SabiBio demo agent. Ask me about pricing, order tracking, or channel integrations — I'll respond in real time.",
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef(0);
  const nextId = () => {
    counterRef.current += 1;
    return `m-${counterRef.current}`;
  };

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, typing]);

  function send(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const visitorMessage: DemoMessage = {
      id: `${nextId()}-v`,
      role: 'visitor',
      content: trimmed,
    };
    setMessages((prev) => [...prev, visitorMessage]);
    setInput('');
    setTyping(true);

    const delay = 500 + Math.min(1200, trimmed.length * 20);
    window.setTimeout(() => {
      const assistantMessage: DemoMessage = {
        id: `${nextId()}-a`,
        role: 'assistant',
        content: getReply(trimmed),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setTyping(false);
    }, delay);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-br from-cyan-400 to-blue-500 text-slate-950 shadow-lg shadow-cyan-500/30">
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-white">SabiBio Agent</p>
            <p className="text-[11px] text-emerald-300">● Live · replies in seconds</p>
          </div>
        </div>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
          Demo
        </span>
      </div>

      <div
        ref={listRef}
        className="max-h-80 space-y-3 overflow-y-auto px-4 py-4 sm:px-5"
      >
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${message.role === 'visitor' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  message.role === 'visitor'
                    ? 'rounded-br-md bg-cyan-500/90 text-slate-950'
                    : 'rounded-bl-md bg-white/5 text-slate-100'
                }`}
              >
                {message.content}
              </div>
            </motion.div>
          ))}
          {typing && (
            <motion.div
              key="typing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex justify-start"
            >
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-md bg-white/5 px-3.5 py-3">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="border-t border-white/5 px-4 py-3 sm:px-5">
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => send(prompt)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              {prompt}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about pricing, orders, or channels..."
            className="flex-1 rounded-lg border border-slate-700/50 bg-black/40 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 transition-all focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-lg bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/30 transition hover:bg-cyan-300 disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
