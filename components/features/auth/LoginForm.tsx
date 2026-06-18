'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction } from '@/lib/auth/actions';
import { loginSchema } from '@/lib/schemas/auth';

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

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    String((error as { digest: string }).digest).startsWith('NEXT_REDIRECT')
  );
}

export function LoginForm() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.body.style.overflow = '';
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const form = formRef.current ?? e.currentTarget;
    const fd = new FormData(form);
    const raw = {
      email: String(fd.get('email') ?? '').trim(),
      password: String(fd.get('password') ?? ''),
    };

    const parsed = loginSchema.safeParse(raw);
    if (!parsed.success) {
      const next: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === 'email' || key === 'password') next[key] = issue.message;
      }
      setFieldErrors(next);
      return;
    }

    setSubmitting(true);
    setIsRedirecting(true);
    try {
      const payload = new FormData(form);
      payload.set('email', parsed.data.email.toLowerCase());
      payload.set('password', parsed.data.password);
      const next = searchParams.get('next') || searchParams.get('redirect');
      if (next) payload.set('next', next);

      const result = await loginAction(payload);
      if (result?.error) {
        setIsRedirecting(false);
        if (result.error === 'db_unavailable') {
          setError(t('dbUnavailable'));
        } else {
          setError(mapLoginApiError(result.error, t));
        }
      }
    } catch (err) {
      if (isNextRedirect(err)) return;
      setIsRedirecting(false);
      setError(t('connectionError'));
    } finally {
      setSubmitting(false);
    }
  }

  const loading = submitting || isRedirecting;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="auth-form space-y-4" noValidate>
      <div>
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="ejemplo@correo.com"
          className="auth-input text-base"
          disabled={isRedirecting}
        />
        {fieldErrors.email ? (
          <p className="text-xs text-destructive">{fieldErrors.email}</p>
        ) : null}
      </div>
      <div>
        <Label htmlFor="password">{t('password')}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className="auth-input text-base"
          disabled={isRedirecting}
        />
        {fieldErrors.password ? (
          <p className="text-xs text-destructive">{fieldErrors.password}</p>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="w-full text-base" disabled={loading}>
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
