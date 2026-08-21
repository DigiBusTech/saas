'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

export type BillingInterval = 'monthly' | 'annual';

interface BillingToggleProps {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
  savingsLabel?: string;
  className?: string;
}

/**
 * Universal Monthly/Annual Billing Toggle Component
 * 
 * A sleek, animated pill toggle switch for selecting billing intervals.
 * Used across:
 * - Public pricing page
 * - Tenant billing dashboard  
 * - Workspace billing upgrade modals
 * 
 * @param value - Current billing interval selection
 * @param onChange - Callback when user toggles interval
 * @param savingsLabel - Optional custom savings text (default: "Save 2 Months")
 * @param className - Optional additional CSS classes
 */
export function BillingToggle({ 
  value, 
  onChange, 
  savingsLabel = 'Save 2 Months',
  className = '' 
}: BillingToggleProps) {
  const isAnnual = value === 'annual';

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={`px-4 py-2 text-sm font-medium rounded-full transition-all ${
          !isAnnual
            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/50'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        Monthly
      </button>

      <div className="relative w-12 h-6 rounded-full bg-muted border border-border transition-colors cursor-pointer" onClick={() => onChange(isAnnual ? 'monthly' : 'annual')}>
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-indigo-500 shadow-md transition-transform duration-300 ease-in-out ${
            isAnnual ? 'translate-x-6' : 'translate-x-0'
          }`}
        >
          {isAnnual && <Check className="w-3 h-3 text-white mx-auto mt-1" />}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange('annual')}
        className={`px-4 py-2 text-sm font-medium rounded-full transition-all relative ${
          isAnnual
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <span>Annual</span>
        {isAnnual && (
          <span className="ml-2 text-[10px] bg-white/20 px-2 py-0.5 rounded-full">
            {savingsLabel}
          </span>
        )}
      </button>
    </div>
  );
}

/**
 * Compact pill-style billing toggle (alternative design)
 */
export function BillingTogglePill({ value, onChange, className = '' }: Omit<BillingToggleProps, 'savingsLabel'>) {
  const isAnnual = value === 'annual';

  return (
    <div className={`inline-flex p-1 rounded-full bg-muted border border-border ${className}`}>
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={`px-6 py-2 text-sm font-medium rounded-full transition-all ${
          !isAnnual ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm' : 'text-muted-foreground'
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange('annual')}
        className={`px-6 py-2 text-sm font-medium rounded-full transition-all ${
          isAnnual ? 'bg-white dark:bg-slate-800 text-foreground shadow-sm' : 'text-muted-foreground'
        }`}
      >
        <span>Annual</span>
        <span className="ml-2 text-[10px] text-emerald-500 font-bold">-17%</span>
      </button>
    </div>
  );
}
