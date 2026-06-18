'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginSchema, type LoginInput } from '@/lib/schemas/auth';

type LoginApiError =
  | 'missing_credentials'
  | 'user_not_found'
  | 'wrong_password'
  | 'unverified'
  | 'db_unavailable'
  | 'server_error';

function mapLoginApiError(code: string | undefined, t: (key: string) => string): string {
  switch (code as LoginApiError) {
    case 'missing_credentials':
      return t('missingCredentials');
    case 'user_not_found':
      return t('userNotFound');
    case 'wrong_password':
      return t('wrongPassword');
    case 'unverified':
      return t('unverified');
    case 'db_unavailable':
      return t('dbUnavailable');
    case 'server_error':
      return t('serverError');
    default:
      return t('loginError');
  }
}

export function LoginForm() {
  const t = useTranslations('auth');
  const [error, setError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const loading = isSubmitting || isRedirecting;

  async function onSubmit(data: LoginInput) {
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          password: data.password,
        }),
        credentials: 'same-origin',
      });

      const payload = (await res.json().catch(() => null)) as {
        ok?: boolean;
        redirect?: string;
        error?: string;
      } | null;

      if (res.ok && payload?.ok && payload.redirect) {
        setIsRedirecting(true);
        window.location.href = payload.redirect;
        return;
      }

      if (res.status === 503) {
        setError(t('dbUnavailable'));
        return;
      }

      setError(mapLoginApiError(payload?.error, t));
    } catch {
      setError(t('connectionError'));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="ejemplo@correo.com"
          disabled={loading}
          {...register('email')}
        />
        {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
      </div>
      <div>
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          disabled={loading}
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? t('loggingIn') : t('login')}
      </Button>
      <p className="text-center text-sm">
        <Link href="/reestablecer-password" className="text-muted-foreground hover:text-primary">
          {t('forgotPassword')}
        </Link>
      </p>
      <p className="text-center text-sm">
        {t('noAccount')}{' '}
        <Link href="/registro" className="font-medium text-primary">
          {t('signUp')}
        </Link>
      </p>
      <Link href="/" className="block text-center text-xs text-muted-foreground">
        {t('backHome')}
      </Link>
    </form>
  );
}
