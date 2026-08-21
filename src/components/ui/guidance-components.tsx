'use client';

import { InputHTMLAttributes, ReactNode, useState } from 'react';
import { motion } from 'framer-motion';

interface FeatureGuideProps {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  collapsible?: boolean;
  defaultOpen?: boolean;
}

/**
 * Feature Guide Banner - Appears at top of pages to help non-technical users
 * Explains what the page does and how to use it
 */
export function FeatureGuide({
  title,
  description,
  icon,
  action,
  collapsible = true,
  defaultOpen = true,
}: FeatureGuideProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: isOpen ? 1 : 0.5, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-6 overflow-hidden"
    >
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="mt-1 shrink-0 text-primary">
              {icon}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-foreground text-sm">
                {title}
              </h3>
              {collapsible && (
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  aria-label={isOpen ? 'Collapse' : 'Expand'}
                >
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${
                      isOpen ? '' : '-rotate-180'
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
              )}
            </div>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2"
              >
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {description}
                </p>
                {action && (
                  <div className="mt-3">
                    {action.href ? (
                      <a
                        href={action.href}
                        className="inline-flex text-xs font-medium text-primary hover:underline transition-colors"
                      >
                        {action.label} →
                      </a>
                    ) : (
                      <button
                        onClick={action.onClick}
                        className="text-xs font-medium text-primary hover:underline transition-colors"
                      >
                        {action.label} →
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Contextual Tooltip Component
 */
interface TooltipProps {
  content: string;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const positionClasses: Record<string, string> = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {children}
      </div>
      {showTooltip && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`absolute ${positionClasses[side]} px-2.5 py-1.5 bg-popover text-popover-foreground border border-border text-xs rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none`}
        >
          {content}
        </motion.div>
      )}
    </div>
  );
}

/**
 * Enhanced Input with Helper Text and Icon
 */
interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  placeholder?: string;
  helperText?: string;
  icon?: ReactNode;
  error?: string;
  type?: string;
  required?: boolean;
}

export function FormInput({
  label,
  placeholder,
  helperText,
  icon,
  error,
  type = 'text',
  required = false,
  ...props
}: FormInputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1.5">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground shrink-0">
            {icon}
          </div>
        )}
        <input
          type={type}
          placeholder={placeholder}
          className={`w-full ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2.5 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all duration-200 ${
            error
              ? 'border-destructive'
              : 'border-input'
          }`}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {helperText}
        </p>
      )}
    </div>
  );
}

/**
 * Warm Empty State Component
 */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  image?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  image,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {image ? (
        <img src={image} alt="" className="w-48 h-48 mb-6 opacity-80" />
      ) : icon ? (
        <div className="text-6xl mb-4 text-slate-300 dark:text-slate-600">
          {icon}
        </div>
      ) : null}
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mb-6">
        {description}
      </p>
      {action && (
        <>
          {action.href ? (
            <a
              href={action.href}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-cyan-600/30"
            >
              {action.label}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </a>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-cyan-600/30"
            >
              {action.label}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          )}
        </>
      )}
    </motion.div>
  );
}
