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
        <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          {...props}
          type={visible ? 'text' : 'password'}
          className={`w-full rounded-lg border border-input bg-background px-4 py-3 pr-11 text-sm text-foreground outline-none placeholder:text-muted-foreground/60 transition-all focus:border-ring focus:ring-1 focus:ring-ring ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={visible ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {helperText && <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>}
    </div>
  );
}
