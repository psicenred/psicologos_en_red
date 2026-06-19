import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { ForgotPasswordForm } from '@/components/features/auth/ForgotPasswordForm';
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm';
import { ensureDb, isResetTokenValid } from '@/lib/auth/service';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('forgotPasswordTitle') };
}

export default async function ReestablecerPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const t = await getTranslations('auth');
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthLayout title={t('forgotPasswordTitle')} subtitle={t('forgotPasswordSubtitle')}>
        <ForgotPasswordForm />
      </AuthLayout>
    );
  }

  if (!ensureDb()) {
    return (
      <AuthLayout title={t('serviceUnavailable')} subtitle={t('dbUnavailable')}>
        <Link href="/" className="block text-center text-sm text-primary">
          {t('backHome')}
        </Link>
      </AuthLayout>
    );
  }

  const valid = await isResetTokenValid(token);
  if (!valid) {
    return (
      <AuthLayout title={t('resetLinkExpired')} subtitle={t('resetLinkExpiredHint')}>
        <Link href="/reestablecer-password" className="block text-center text-sm text-primary">
          {t('requestNewResetLink')}
        </Link>
        <Link href="/login" className="mt-3 block text-center text-xs text-muted-foreground">
          {t('goLogin')}
        </Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('newPasswordTitle')} subtitle={t('newPasswordSubtitle')}>
      <ResetPasswordForm token={token} />
    </AuthLayout>
  );
}
