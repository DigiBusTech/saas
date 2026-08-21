'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Laptop } from 'lucide-react';

interface ThemeToggleProps {
  showSystemOption?: boolean;
  className?: string;
  size?: 'sm' | 'md';
}

export function ThemeToggle({ showSystemOption = false, className = '', size = 'md' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`rounded-lg border border-border bg-card/50 opacity-0 ${size === 'sm' ? 'w-8 h-8' : 'w-9 h-9'} ${className}`} />
    );
  }

  const isDark = resolvedTheme === 'dark';

  if (showSystemOption) {
    return (
      <div className={`flex items-center gap-1 rounded-lg border border-border bg-card p-1 text-muted-foreground ${className}`}>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
            theme === 'light' ? 'bg-primary text-primary-foreground font-medium shadow-xs' : 'hover:bg-muted hover:text-foreground'
          }`}
          title="Light mode"
          aria-label="Light mode"
        >
          <Sun className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
            theme === 'dark' ? 'bg-primary text-primary-foreground font-medium shadow-xs' : 'hover:bg-muted hover:text-foreground'
          }`}
          title="Dark mode"
          aria-label="Dark mode"
        >
          <Moon className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`flex items-center justify-center rounded-md p-1.5 transition-colors ${
            theme === 'system' ? 'bg-primary text-primary-foreground font-medium shadow-xs' : 'hover:bg-muted hover:text-foreground'
          }`}
          title="System preference"
          aria-label="System preference"
        >
          <Laptop className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`relative inline-flex items-center justify-center rounded-lg border border-border bg-card/80 text-foreground shadow-xs transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        size === 'sm' ? 'h-8 w-8 p-1.5' : 'h-9 w-9 p-2'
      } ${className}`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      aria-label="Toggle theme"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <Moon className="h-4 w-4 text-cyan-400" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <Sun className="h-4 w-4 text-amber-500" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
