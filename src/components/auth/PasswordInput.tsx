'use client';

import { InputHTMLAttributes, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  helperText?: string;
}

export function PasswordInput({ label, helperText, className = '', ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...props}
          type={visible ? 'text' : 'password'}
          className={`w-full rounded-lg border border-slate-700/50 bg-black/40 px-4 py-3 pr-11 text-sm text-white outline-none placeholder:text-slate-600 transition-all focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-white/5 hover:text-white"
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {helperText && <p className="mt-1.5 text-xs text-slate-500">{helperText}</p>}
    </div>
  );
}
