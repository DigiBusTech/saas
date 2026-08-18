'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Loader2, Sparkles, ArrowRight, Building2, Users, Rocket } from 'lucide-react';
import { createWorkspace } from '../workspaces/actions';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const ONBOARDING_STEPS = [
  { id: 1, label: 'Business Name', icon: Building2, desc: 'Tell us about your business' },
  { id: 2, label: 'Target Audience', icon: Users, desc: 'Who are your customers?' },
  { id: 3, label: 'Create Workspace', icon: Rocket, desc: 'Launch your first business' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState('');
  const [audience, setAudience] = useState('');
  const [creating, setCreating] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Welcome! 🚀 I'm your AI setup assistant. Let's get your first business up and running in under 2 minutes.\n\n**What's the name of your business?** (e.g. "Lagos Style Boutique", "TechFix Solutions")`,
    },
  ]);

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    // Track business name and audience from user messages
    const userMsgCount = messages.filter((m) => m.role === 'user').length;
    if (userMsgCount === 0) setBusinessName(text);
    if (userMsgCount === 1) setAudience(text);

    const userMsg: ChatMessage = { id: `user-${Date.now()}`, role: 'user', content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error('Failed to get response');

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      const assistantId = `assistant-${Date.now()}`;
      let assistantContent = '';

      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const textDelta = JSON.parse(line.slice(2));
                assistantContent += textDelta;
                setMessages((prev) =>
                  prev.map((m) => m.id === assistantId ? { ...m, content: assistantContent } : m)
                );
              } catch { /* skip */ }
            }
          }
        }
      }

      // Auto-detect step progression
      const lower = assistantContent.toLowerCase();
      if (step === 1 && (lower.includes('audience') || lower.includes('customers') || lower.includes('who do you'))) {
        setStep(2);
      } else if (step === 2 && (lower.includes('create') || lower.includes('workspace') || lower.includes('ready to launch'))) {
        setStep(3);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const handleCreateWorkspace = async () => {
    if (!businessName) return;
    setCreating(true);

    const slug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 40);

    const fd = new FormData();
    fd.set('name', businessName);
    fd.set('slug', slug);
    fd.set('bot_persona', 'Professional English');

    const result = await createWorkspace(fd);

    if (result.error) {
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: 'assistant', content: `⚠️ Workspace creation failed: ${result.error}` },
      ]);
      setCreating(false);
      return;
    }

    // Redirect to the new workspace dashboard
    if (result.data?.id) {
      router.push(`/dashboard/${result.data.id}/integrations`);
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider">AI Onboarding Wizard</span>
          </div>
          <h1 className="text-xl font-bold text-white">Set Up Your First Business</h1>
          <p className="text-xs text-gray-500 mt-1.5">Chat with the AI assistant to configure your workspace in minutes.</p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center justify-center gap-1 mb-6">
          {ONBOARDING_STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1">
              <motion.div
                animate={{
                  scale: step === s.id ? 1.05 : 1,
                  borderColor: step === s.id ? 'rgba(99,102,241,0.5)' : step > s.id ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.05)',
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300
                  ${step === s.id
                    ? 'bg-indigo-500/10 border-indigo-500/30'
                    : step > s.id
                      ? 'bg-emerald-500/5 border-emerald-500/20'
                      : 'bg-zinc-900/40 border-white/5'}`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold
                  ${step > s.id ? 'bg-emerald-500 text-white' : step === s.id ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-gray-600'}`}>
                  {step > s.id ? '✓' : s.id}
                </div>
                <span className={`text-[10px] font-medium hidden sm:inline
                  ${step === s.id ? 'text-indigo-400' : step > s.id ? 'text-emerald-400' : 'text-gray-600'}`}>
                  {s.label}
                </span>
              </motion.div>
              {i < ONBOARDING_STEPS.length - 1 && (
                <ArrowRight className={`w-3 h-3 ${step > s.id ? 'text-emerald-500' : 'text-gray-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Chat Interface */}
        <div className="rounded-2xl bg-zinc-900/60 backdrop-blur-md border border-white/10 overflow-hidden shadow-2xl">
          {/* Messages */}
          <div ref={scrollRef} className="h-[400px] overflow-y-auto p-5 space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed
                    ${msg.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-zinc-800/80 backdrop-blur-sm border border-white/5 text-gray-300'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <Bot className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="text-[9px] text-indigo-400 font-semibold uppercase">AI Assistant</span>
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="bg-zinc-800/80 border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                  <span className="text-[10px] text-gray-500">Thinking...</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Input Area */}
          {step < 3 ? (
            <form onSubmit={handleSubmit} className="border-t border-white/5 p-4 flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={step === 1 ? 'Enter your business name...' : 'Describe your target audience...'}
                disabled={isLoading}
                className="flex-1 px-4 py-3 rounded-xl bg-zinc-800/50 border border-white/10 text-sm text-white
                  placeholder:text-gray-600 focus:border-indigo-500/40 focus:ring-1 focus:ring-indigo-500/20 outline-none transition disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-5 py-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600
                  hover:from-indigo-400 hover:to-purple-500 disabled:opacity-40 shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            /* Step 3: Create Workspace Button */
            <div className="border-t border-white/5 p-5">
              <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-xl border border-indigo-500/20 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-semibold text-white">Ready to Launch!</h3>
                </div>
                <div className="text-[10px] text-gray-400 space-y-1">
                  <p><span className="text-gray-500">Business:</span> <span className="text-white font-medium">{businessName || 'Not set'}</span></p>
                  {audience && <p><span className="text-gray-500">Audience:</span> <span className="text-white font-medium">{audience}</span></p>}
                </div>
                <button
                  onClick={handleCreateWorkspace}
                  disabled={creating || !businessName}
                  className="w-full py-3 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600
                    hover:from-indigo-400 hover:to-purple-500 disabled:opacity-50 shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating your workspace...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-3.5 h-3.5" />
                      Create &quot;{businessName}&quot; Workspace
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
