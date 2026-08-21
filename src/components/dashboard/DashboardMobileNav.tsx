'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { DashboardNavGroups } from './DashboardNavGroups';
import type { NavGroup } from '@/lib/dashboard-nav-config';

export function DashboardMobileNav({ groups }: { groups: NavGroup[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-3 z-40 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-zinc-950/90 text-white shadow-lg backdrop-blur-md lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close navigation"
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-[min(86vw,22rem)] overflow-y-auto border-r border-white/10 bg-zinc-950 px-4 pb-6 pt-4 text-gray-300 shadow-2xl lg:hidden"
            >
              <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-sm font-semibold text-white">SabiBio</p>
                  <p className="mt-0.5 text-xs text-gray-500">Workspace navigation</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 hover:bg-white/5 hover:text-white"
                  aria-label="Close navigation"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <DashboardNavGroups groups={groups} collapsible />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
