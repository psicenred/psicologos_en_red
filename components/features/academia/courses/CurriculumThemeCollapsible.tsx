import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface CurriculumThemeCollapsibleProps {
  themeId: string;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
  variant?: 'plain' | 'card';
  children: ReactNode;
}

export function CurriculumThemeCollapsible({
  themeId,
  title,
  meta,
  actions,
  defaultOpen = false,
  variant = 'plain',
  children,
}: CurriculumThemeCollapsibleProps) {
  const isCard = variant === 'card';

  return (
    <details
      id={`theme-${themeId}`}
      open={defaultOpen}
      className={`group ${isCard ? 'overflow-hidden rounded-xl border border-[var(--color-arena)] bg-card shadow-sm' : 'rounded-lg border border-[var(--color-arena)] bg-card/50'}`}
    >
      <summary
        className={`flex cursor-pointer list-none items-start justify-between gap-3 [&::-webkit-details-marker]:hidden ${
          isCard
            ? 'border-b border-transparent px-5 py-4 transition-colors group-open:border-[var(--color-arena)] group-open:bg-secondary/10'
            : 'px-4 py-3 hover:bg-muted/30'
        }`}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className={`font-semibold text-foreground ${isCard ? 'text-lg' : 'text-base'}`}>
              {title}
            </h3>
            {meta ? <div className="flex shrink-0 flex-wrap items-center gap-2">{meta}</div> : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <ChevronDown
            className="h-5 w-5 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
            aria-hidden
          />
        </div>
      </summary>

      <div
        className={`space-y-5 ${isCard ? 'p-5 pt-4' : 'border-t border-[var(--color-arena)] px-4 pb-4 pt-3'}`}
      >
        {children}
      </div>
    </details>
  );
}
