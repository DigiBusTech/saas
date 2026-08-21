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
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {guide && (
        <details
          {...(defaultCollapsed ? {} : { open: true })}
          className="group rounded-xl border border-primary/20 bg-primary/5 backdrop-blur-sm open:shadow-lg open:shadow-primary/5"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm outline-none transition hover:bg-muted/50">
            <span className="flex items-center gap-2 text-foreground">
              <span
                aria-hidden
                className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary"
              >
                ?
              </span>
              <span className="font-medium">How this page helps you</span>
            </span>
            <span className="text-xs uppercase tracking-widest text-primary/80 transition group-open:hidden">
              Show guide
            </span>
            <span className="hidden text-xs uppercase tracking-widest text-primary/80 group-open:inline">
              Hide guide
            </span>
          </summary>
          <div className="border-t border-border/50 px-4 py-4 text-sm leading-6 text-muted-foreground sm:px-5">
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  What this page does
                </p>
                <p className="mt-2 text-foreground">{guide.what}</p>
              </div>
              {guide.how && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                    How to use it
                  </p>
                  <p className="mt-2 text-foreground">{guide.how}</p>
                </div>
              )}
            </div>

            {guide.tips && guide.tips.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-border/50 pt-4">
                {guide.tips.map((tip) => (
                  <li key={tip} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            )}

            {guide.docHref && (
              <div className="mt-4 border-t border-border/50 pt-4">
                <a
                  href={guide.docHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
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
