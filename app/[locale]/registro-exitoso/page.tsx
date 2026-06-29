import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { RegistroExitosoContent } from '@/components/features/auth/RegistroExitosoContent';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('auth');
  return { title: t('registerSuccessTitle') };
}

export default async function RegistroExitosoPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const initialEmail = email?.trim().toLowerCase() ?? '';

  return <RegistroExitosoContent initialEmail={initialEmail} />;
}
