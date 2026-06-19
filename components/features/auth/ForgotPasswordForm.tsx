'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/schemas/auth';

export function ForgotPasswordForm() {
  const t = useTranslations('auth');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(data: ForgotPasswordInput) {
    setError('');
    setSent(false);

    try {
      const res = await fetch('/api/auth/olvide-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: data.email.trim().toLowerCase() }),
      });

      const json = (await res.json()) as { error?: string; ok?: boolean };

      if (!res.ok) {
        if (json.error === 'user_not_found') {
          setError(t('resetEmailNotFound'));
        } else if (json.error === 'mail_failed') {
          setError(t('resetEmailFailed'));
        } else if (json.error === 'db_unavailable') {
          setError(t('dbUnavailable'));
        } else {
          setError(t('connectionError'));
        }
        return;
      }

      setSent(true);
    } catch {
      setError(t('connectionError'));
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">{t('resetEmailSent')}</p>
        <Link href="/login" className="inline-block text-sm font-medium text-primary">
          {t('goLogin')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form space-y-4" noValidate>
      <p className="text-sm text-muted-foreground">{t('forgotPasswordHint')}</p>
      <div>
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="ejemplo@correo.com"
          className="auth-input text-base"
          disabled={isSubmitting}
          {...register('email')}
        />
        {errors.email ? (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full text-base" disabled={isSubmitting}>
        {isSubmitting ? t('sendingResetEmail') : t('sendResetEmail')}
      </Button>
      <Link href="/login" className="block text-center text-sm text-primary">
        {t('goLogin')}
      </Link>
    </form>
  );
}
