'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/schemas/auth';

type ResendVerificationFormProps = {
  /** Correo precargado (p. ej. tras registro o desde login). */
  defaultEmail?: string;
  /** Ocultar el texto introductorio (p. ej. en registro exitoso). */
  compact?: boolean;
};

export function ResendVerificationForm({
  defaultEmail = '',
  compact = false,
}: ResendVerificationFormProps) {
  const t = useTranslations('auth');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: defaultEmail },
  });

  useEffect(() => {
    if (defaultEmail) {
      reset({ email: defaultEmail });
    }
  }, [defaultEmail, reset]);

  async function onSubmit(data: ForgotPasswordInput) {
    setError('');
    setSent(false);
    const email = data.email.trim().toLowerCase();

    try {
      const res = await fetch('/api/auth/reenviar-verificacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email }),
      });

      const json = (await res.json()) as { error?: string; ok?: boolean; email?: string };

      if (!res.ok) {
        if (json.error === 'user_not_found') {
          setError(t('verificationResendNotFound'));
        } else if (json.error === 'already_verified') {
          setError(t('verificationAlreadyVerified'));
        } else if (json.error === 'mail_failed') {
          setError(t('verificationResendFailed'));
        } else if (json.error === 'db_unavailable') {
          setError(t('dbUnavailable'));
        } else {
          setError(t('connectionError'));
        }
        return;
      }

      setSentEmail(json.email || email);
      setSent(true);
    } catch {
      setError(t('connectionError'));
    }
  }

  if (sent) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-muted-foreground">
          {t('verificationResendSent', { email: sentEmail })}
        </p>
        <Link href="/login" className="inline-block text-sm font-medium text-primary">
          {t('goLogin')}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="auth-form space-y-4" noValidate>
      {!compact ? (
        <p className="text-sm text-muted-foreground">{t('verificationResendHint')}</p>
      ) : null}
      <div>
        <Label htmlFor="resend-email">{t('email')}</Label>
        <Input
          id="resend-email"
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
        {isSubmitting ? t('verificationResending') : t('verificationResendButton')}
      </Button>
    </form>
  );
}
