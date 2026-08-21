'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import type { NavGroup, NavItem } from '@/lib/dashboard-nav-config';

interface DashboardNavGroupsProps {
  groups: NavGroup[];
  collapsible?: boolean;
  defaultOpen?: Record<string, boolean>;
}

/**
 * Reorganized Navigation with 5 Functional Groups
 * Each group is collapsible with emoji badges and descriptions
 */
export function DashboardNavGroups({
  groups,
  collapsible = true,
  defaultOpen,
}: DashboardNavGroupsProps) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    defaultOpen || groups.reduce((acc, g) => ({ ...acc, [g.id]: true }), {})
  );

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  return (
    <nav className="space-y-1">
      {groups.map((group) => {
        const isOpen = openGroups[group.id] ?? true;
        const hasActiveItem = group.items.some((item) => pathname?.startsWith(item.href));

        return (
          <motion.div
            key={group.id}
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-0.5"
          >
            {/* Group Header */}
            <button
              onClick={() => collapsible && toggleGroup(group.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                hasActiveItem
                  ? 'text-cyan-400'
                  : 'text-slate-500 hover:text-slate-300'
              } ${collapsible ? 'cursor-pointer hover:bg-slate-800/40 rounded-lg' : ''}`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm">{group.emoji}</span>
                <span className="truncate">{group.title}</span>
              </div>
              {collapsible && (
                <motion.svg
                  className="w-3.5 h-3.5 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  animate={{ rotate: isOpen ? 0 : -90 }}
                  transition={{ duration: 0.2 }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </motion.svg>
              )}
            </button>

            {/* Collapsible Content */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key={`${group.id}-content`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                            <div className="space-y-1 py-1">
                    {group.items.map((item) => (
                      <NavLink key={item.href} item={item} isActive={pathname?.startsWith(item.href) || false} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </nav>
  );
}

/**
 * Individual Navigation Link with Icon and Tooltip
 */
interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
}

function NavLink({ item, isActive }: NavLinkProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.div
      whileHover={{ x: 2 }}
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Link
        href={item.href}
        className={`flex min-h-11 items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 truncate ${
          isActive
            ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
            : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/40 border border-transparent'
        }`}
      >
        <svg
          className="w-4 h-4 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d={item.icon}
          />
        </svg>
        <span className="truncate">{item.label}</span>
        {item.badge && (
          <span className="ml-auto text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full shrink-0">
            {item.badge}
          </span>
        )}
      </Link>

      {/* Tooltip with description */}
      {showTooltip && item.description && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          className="absolute left-full ml-2 top-0 z-50 pointer-events-none"
        >
          <div className="bg-slate-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg border border-slate-700">
            {item.description}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
