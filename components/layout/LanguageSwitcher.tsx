'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';
import type { Locale } from '@/i18n/routing';

function FlagMexico({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="16" fill="#006847" />
      <rect x="8" width="8" height="16" fill="#fff" />
      <rect x="16" width="8" height="16" fill="#ce1126" />
      <circle cx="12" cy="8" r="2.2" fill="#006847" />
    </svg>
  );
}

function FlagUsa({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 16" className={className} aria-hidden="true">
      <rect width="24" height="16" fill="#b22234" />
      <rect y="1.23" width="24" height="1.23" fill="#fff" />
      <rect y="3.69" width="24" height="1.23" fill="#fff" />
      <rect y="6.15" width="24" height="1.23" fill="#fff" />
      <rect y="8.62" width="24" height="1.23" fill="#fff" />
      <rect y="11.08" width="24" height="1.23" fill="#fff" />
      <rect y="13.54" width="24" height="1.23" fill="#fff" />
      <rect width="10" height="8.62" fill="#3c3b6e" />
    </svg>
  );
}

const LOCALES: { code: Locale; label: string; Flag: typeof FlagMexico }[] = [
  { code: 'es', label: 'Español', Flag: FlagMexico },
  { code: 'en', label: 'English', Flag: FlagUsa },
];

export function LanguageSwitcher({
  className,
  onChange,
}: {
  className?: string;
  onChange?: () => void;
}) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('nav');

  function select(next: Locale) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
    onChange?.();
  }

  return (
    <div
      className={cn('lang-flag-switcher', className)}
      role="group"
      aria-label={t('language')}
    >
      {LOCALES.map(({ code, label, Flag }) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            className={cn('lang-flag-btn', active && 'lang-flag-btn-active')}
            aria-label={label}
            aria-pressed={active}
            title={label}
            onClick={() => select(code)}
          >
            <Flag className="lang-flag-icon" />
          </button>
        );
      })}
    </div>
  );
}
