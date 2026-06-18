'use client';

import { useEffect } from 'react';
import { Link } from '@/i18n/routing';

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  useEffect(() => {
    document.body.style.overflow = '';
    document.body.style.position = '';
  }, []);

  return (
    <div className="auth-page flex min-h-[100dvh] w-full items-start justify-center overflow-y-auto bg-gradient-to-br from-primary to-accent px-4 py-8 sm:items-center sm:py-6">
      <div className="auth-card w-full max-w-md shrink-0 rounded-2xl border-t-8 border-primary bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 text-primary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.png" alt="" className="h-9 w-9 object-contain" />
            <span className="font-semibold">Psicólogos en Red</span>
          </Link>
          <h1 className="mt-4 text-2xl font-bold text-foreground">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
