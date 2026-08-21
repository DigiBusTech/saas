'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, MessageSquare, Package, Sparkles, TrendingUp } from 'lucide-react';

export function HeroPreview() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -inset-8 rounded-3xl bg-linear-to-br from-cyan-500/20 via-blue-500/10 to-transparent blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 30, rotateX: -8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative rounded-2xl border border-white/10 bg-slate-950/80 p-4 shadow-2xl backdrop-blur-xl sm:p-5"
      >
        <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/60" />
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-white/5 bg-white/2 px-3 py-1 text-[10px] text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            sabibio.link/dashboard
          </div>
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-linear-to-br from-cyan-400 to-blue-500 text-[10px] font-bold text-slate-950">
            SB
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            icon={<MessageSquare className="h-4 w-4" />}
            label="Live conversations"
            value="128"
            trend="+18%"
            accent="from-cyan-400/20 to-cyan-500/5"
            iconColor="text-cyan-300"
          />
          <StatCard
            icon={<Package className="h-4 w-4" />}
            label="Orders today"
            value="42"
            trend="+9%"
            accent="from-amber-400/20 to-amber-500/5"
            iconColor="text-amber-300"
          />
          <StatCard
            icon={<TrendingUp className="h-4 w-4" />}
            label="RAG deflection"
            value="76%"
            trend="+3%"
            accent="from-emerald-400/20 to-emerald-500/5"
            iconColor="text-emerald-300"
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr]">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl border border-white/5 bg-white/2 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Recent chats
              </p>
              <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                3 new
              </span>
            </div>
            <div className="space-y-2">
              <ChatRow name="Aisha O." channel="WhatsApp" preview="Do you deliver to Lagos?" unread />
              <ChatRow name="Kwame A." channel="Telegram" preview="Where's my order #A2019?" />
              <ChatRow name="Chinelo E." channel="Web" preview="Thanks — this looks great!" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col gap-3"
          >
            <div className="rounded-xl border border-cyan-400/20 bg-linear-to-br from-cyan-500/10 to-blue-500/5 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-200">
                  AI insight
                </p>
              </div>
              <p className="text-sm leading-relaxed text-slate-200">
                Repeat customers are asking about your Ankara collection. Consider a WhatsApp broadcast.
              </p>
            </div>

            <div className="rounded-xl border border-white/5 bg-white/2 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                Automation health
              </p>
              <div className="space-y-2">
                <HealthRow label="Autopilot" status="Active" ok />
                <HealthRow label="Payment webhooks" status="200 OK" ok />
                <HealthRow label="KB indexing" status="Fresh" ok />
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  trend,
  accent,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  accent: string;
  iconColor: string;
}) {
  return (
    <div className={`rounded-xl border border-white/5 bg-linear-to-br ${accent} p-3`}>
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 ${iconColor}`}>
        {icon}
      </div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <p className="text-xl font-semibold text-white">{value}</p>
        <span className="text-[10px] font-semibold text-emerald-300">{trend}</span>
      </div>
    </div>
  );
}

function ChatRow({
  name,
  channel,
  preview,
  unread,
}: {
  name: string;
  channel: string;
  preview: string;
  unread?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-white/3">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-linear-to-br from-indigo-500/30 to-purple-500/20 text-[10px] font-bold text-indigo-200">
        {name[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-xs font-semibold text-white">{name}</p>
          <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] uppercase text-slate-400">
            {channel}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-slate-500">{preview}</p>
      </div>
      {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400" />}
    </div>
  );
}

function HealthRow({ label, status, ok }: { label: string; status: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-400">{label}</span>
      <span className={`flex items-center gap-1 ${ok ? 'text-emerald-300' : 'text-amber-300'}`}>
        <CheckCircle2 className="h-3 w-3" />
        {status}
      </span>
    </div>
  );
}
