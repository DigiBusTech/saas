'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

export function AppPreloader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(false), 650);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;
  return <div className="fixed inset-0 z-100 flex items-center justify-center bg-[#081018] transition-opacity"><div className="relative flex flex-col items-center gap-4"><div className="absolute h-28 w-28 animate-ping rounded-full bg-cyan-400/10" /><div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 shadow-2xl shadow-cyan-500/20"><Sparkles className="h-7 w-7 animate-pulse text-cyan-300" /></div><div className="text-sm font-semibold tracking-[0.3em] text-white">SABIBIO</div><div className="h-0.5 w-24 overflow-hidden rounded-full bg-white/10"><div className="h-full w-1/2 animate-[loader_0.9s_ease-in-out_infinite] bg-cyan-300" /></div></div></div>;
}
