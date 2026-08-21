import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  guide?: {
    what: string;
    how?: string;
    tips?: string[];
    docHref?: string;
    docLabel?: string;
  };
  actions?: ReactNode;
  defaultCollapsed?: boolean;
}

export function PageHeader({ title, subtitle, icon, guide, actions, defaultCollapsed = false }: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cyan-300">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {guide && (
        <details
          {...(defaultCollapsed ? {} : { open: true })}
          className="group rounded-xl border border-cyan-400/20 bg-linear-to-br from-cyan-500/8 to-blue-500/5 backdrop-blur-sm open:shadow-lg open:shadow-cyan-500/5"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm outline-none transition hover:bg-white/2">
            <span className="flex items-center gap-2 text-slate-100">
              <span
                aria-hidden
                className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/20 text-xs font-bold text-cyan-200"
              >
                ?
              </span>
              <span className="font-medium">How this page helps you</span>
            </span>
            <span className="text-xs uppercase tracking-widest text-cyan-200/80 transition group-open:hidden">
              Show guide
            </span>
            <span className="hidden text-xs uppercase tracking-widest text-cyan-200/80 group-open:inline">
              Hide guide
            </span>
          </summary>
          <div className="border-t border-white/5 px-4 py-4 text-sm leading-6 text-slate-300 sm:px-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                  What this page does
                </p>
                <p className="mt-2 text-slate-300">{guide.what}</p>
              </div>
              {guide.how && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
                    How to use it
                  </p>
                  <p className="mt-2 text-slate-300">{guide.how}</p>
                </div>
              )}
            </div>

            {guide.tips && guide.tips.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-white/5 pt-4">
                {guide.tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}

            {guide.docHref && (
              <div className="mt-4 border-t border-white/5 pt-4">
                <a
                  href={guide.docHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  {guide.docLabel ?? 'Read the full guide'} →
                </a>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
