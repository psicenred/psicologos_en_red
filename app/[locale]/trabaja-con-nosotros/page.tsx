import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { TrabajaPageContent } from '@/components/features/trabaja/TrabajaPageContent';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('trabaja');
  return { title: t('pageTitle') };
}

export default function TrabajaPage() {
  return (
    <PublicLayout>
      <TrabajaPageContent />
    </PublicLayout>
  );
}
