import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { AcademiaPageContent } from '@/components/features/academia/AcademiaPageContent';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('academia');
  return { title: t('title') };
}

export default function AcademiaPage() {
  return (
    <PublicLayout>
      <AcademiaPageContent />
    </PublicLayout>
  );
}
