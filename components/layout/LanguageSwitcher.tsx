'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { cn } from '@/lib/utils';

export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <select
      aria-label="Language"
      className={cn(
        'rounded-md border border-border bg-white px-2 py-1 text-xs font-medium',
        className,
      )}
      value={locale}
      onChange={(e) => router.replace(pathname, { locale: e.target.value })}
    >
      <option value="es">ES</option>
      <option value="en">EN</option>
    </select>
  );
}
