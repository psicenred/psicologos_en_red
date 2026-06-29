import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/routing';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { ResendVerificationForm } from '@/components/features/auth/ResendVerificationForm';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('verificationResendTitle') };
}

function ResendVerificationFormWithEmail({
  initialEmail,
}: {
  initialEmail: string;
}) {
  return <ResendVerificationForm defaultEmail={initialEmail} />;
}

export default async function ReenviarVerificacionPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const t = await getTranslations('auth');
  const { email } = await searchParams;
  const initialEmail = email?.trim().toLowerCase() ?? '';

  return (
    <AuthLayout
      title={t('verificationResendTitle')}
      subtitle={t('verificationResendSubtitle')}
    >
      <Suspense fallback={null}>
        <ResendVerificationFormWithEmail initialEmail={initialEmail} />
      </Suspense>
      <Link href="/login" className="mt-4 block text-center text-sm text-primary">
        {t('goLogin')}
      </Link>
    </AuthLayout>
  );
}
