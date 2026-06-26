'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
];

export function LanguageSwitcher({
  className,
  onChange,
}: {
  className?: string;
  onChange?: () => void;
}) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const t = useTranslations('nav');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const currentLabel =
    LOCALES.find((item) => item.code === locale)?.label ?? 'Español';

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    onChange?.();
  };

  return (
    <div ref={rootRef} className={cn('lang-switcher', className)}>
      <button
        type="button"
        className="lang-switcher-trigger"
        aria-label={`${t('language')}: ${currentLabel}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Globe className="lang-switcher-globe" aria-hidden="true" />
        <span className="lang-switcher-current">{currentLabel}</span>
        <ChevronDown
          className={cn('lang-switcher-chevron', open && 'lang-switcher-chevron-open')}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul
          className="lang-switcher-menu"
          role="listbox"
          aria-label={t('language')}
        >
          {LOCALES.map(({ code, label }) => {
            const active = locale === code;
            return (
              <li key={code} role="presentation">
                {active ? (
                  <span
                    className="lang-switcher-option lang-switcher-option-active"
                    role="option"
                    aria-selected="true"
                  >
                    <Check className="lang-switcher-check" aria-hidden="true" />
                    {label}
                  </span>
                ) : (
                  <Link
                    href={pathname}
                    locale={code}
                    className="lang-switcher-option"
                    role="option"
                    aria-selected="false"
                    onClick={close}
                  >
                    {label}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
